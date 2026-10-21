// Duck registry and manually logged mating events.
//
// The model detects behaviour; it does not know which duck it is looking at.
// Researchers watch the clip, then log the event here and pick the ducks
// involved from a fixed registry (F1–F8, M1–M2), so names stay consistent
// across Mating Events and Egg Quality. Renaming a duck only changes its
// `name`; events store the duck id, so every past event shows the new name.

const { ObjectId } = require("mongodb");

const DEFAULT_DUCKS = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `F${i + 1}`, sex: "female" })),
  ...Array.from({ length: 2 }, (_, i) => ({ id: `M${i + 1}`, sex: "male" })),
].map((d) => ({
  ...d,
  name: `${d.sex === "female" ? "Female" : "Drake"} ${d.id.slice(1)}`,
  marker: "",
}));

const EVENT_BEHAVIORS = ["Mating", "Receptive"];
const AI_RESULTS = ["unchecked", "yes", "no", "wrong"];
const CAMERAS = ["cam1", "cam2", "cam3", "cam4"];

let ducks = DEFAULT_DUCKS.map((d) => ({ ...d }));
let events = []; // newest first
let ducksCol = null;
let eventsCol = null;

function fromDoc(doc) {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

async function initRecords(db) {
  ducksCol = db.collection("ducks");
  eventsCol = db.collection("matingEvents");
  await eventsCol.createIndex({ occurredAt: -1 });

  if ((await ducksCol.countDocuments()) === 0) {
    await ducksCol.insertMany(DEFAULT_DUCKS.map(({ id, ...d }) => ({ _id: id, ...d })));
  }
  ducks = (await ducksCol.find().toArray()).map(fromDoc).sort(byDuckId);
  events = (await eventsCol.find().sort({ occurredAt: -1 }).toArray()).map(fromDoc);
  return { ducks: ducks.length, events: events.length };
}

// F1, F2 … F10, then M1, M2
function byDuckId(a, b) {
  if (a.id[0] !== b.id[0]) return a.id[0] === "F" ? -1 : 1;
  return Number(a.id.slice(1)) - Number(b.id.slice(1));
}

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function findDuck(id) {
  return ducks.find((d) => d.id === id);
}

// Returns { event } or { error }
function validateEvent(body) {
  const occurred = new Date(body.occurredAt);
  if (typeof body.occurredAt !== "string" || Number.isNaN(occurred.getTime()))
    return { error: "date and time are required" };

  const videoUrl = cleanText(body.videoUrl, 2000);
  let parsedUrl = null;
  try {
    parsedUrl = new URL(videoUrl);
  } catch {}
  if (!parsedUrl || !["http:", "https:"].includes(parsedUrl.protocol))
    return { error: "video link must start with http:// or https://" };

  if (!EVENT_BEHAVIORS.includes(body.behavior)) return { error: "invalid behavior" };

  const femaleIds = Array.isArray(body.femaleIds) ? [...new Set(body.femaleIds)] : [];
  for (const id of femaleIds) {
    const duck = findDuck(id);
    if (!duck || duck.sex !== "female") return { error: `unknown female duck: ${id}` };
  }

  let drakeId = null;
  if (body.drakeId) {
    const duck = findDuck(body.drakeId);
    if (!duck || duck.sex !== "male") return { error: `unknown drake: ${body.drakeId}` };
    drakeId = duck.id;
  }

  const camera = CAMERAS.includes(body.camera) ? body.camera : null;
  const aiDetected = AI_RESULTS.includes(body.aiDetected) ? body.aiDetected : "unchecked";

  return {
    event: {
      occurredAt: occurred.toISOString(),
      camera,
      videoUrl,
      behavior: body.behavior,
      femaleIds: femaleIds.sort((a, b) => byDuckId({ id: a }, { id: b })),
      drakeId,
      aiDetected,
      notes: cleanText(body.notes, 1000),
    },
  };
}

function sortEvents() {
  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function storageError(res, err, action) {
  console.error(`Failed to ${action}:`, err.message);
  res.status(500).json({ error: "storage failed" });
}

function registerRecordRoutes(app) {
  // ---- Ducks ----
  app.get("/ducks", (req, res) => res.json(ducks));

  // Add a duck (e.g. a replacement); the id is the next free number for that sex
  app.post("/ducks", async (req, res) => {
    const sex = req.body.sex === "male" ? "male" : req.body.sex === "female" ? "female" : null;
    if (!sex) return res.status(400).json({ error: "sex must be female or male" });
    const prefix = sex === "female" ? "F" : "M";
    const next =
      Math.max(0, ...ducks.filter((d) => d.sex === sex).map((d) => Number(d.id.slice(1)))) + 1;
    const duck = {
      id: `${prefix}${next}`,
      sex,
      name: cleanText(req.body.name, 40) || `${sex === "female" ? "Female" : "Drake"} ${next}`,
      marker: cleanText(req.body.marker, 60),
    };
    if (ducksCol) {
      try {
        const { id, ...doc } = duck;
        await ducksCol.insertOne({ _id: id, ...doc });
      } catch (err) {
        return storageError(res, err, "add duck");
      }
    }
    ducks.push(duck);
    ducks.sort(byDuckId);
    res.json({ success: true, duck });
  });

  // Rename a duck or change its visual marker
  app.patch("/ducks/:id", async (req, res) => {
    const duck = findDuck(req.params.id);
    if (!duck) return res.status(404).json({ error: "duck not found" });
    const update = {};
    if ("name" in req.body) {
      const name = cleanText(req.body.name, 40);
      if (!name) return res.status(400).json({ error: "name can't be empty" });
      update.name = name;
    }
    if ("marker" in req.body) update.marker = cleanText(req.body.marker, 60);
    if (ducksCol) {
      try {
        await ducksCol.updateOne({ _id: duck.id }, { $set: update });
      } catch (err) {
        return storageError(res, err, "update duck");
      }
    }
    Object.assign(duck, update);
    res.json({ success: true, duck });
  });

  // ---- Mating events ----
  app.get("/mating-events", (req, res) => res.json(events));

  app.post("/mating-events", async (req, res) => {
    const { event, error } = validateEvent(req.body);
    if (error) return res.status(400).json({ error });
    const doc = { ...event, createdAt: new Date().toISOString() };
    let record;
    if (eventsCol) {
      try {
        const { insertedId } = await eventsCol.insertOne(doc);
        record = fromDoc({ _id: insertedId, ...doc });
      } catch (err) {
        return storageError(res, err, "save mating event");
      }
    } else {
      record = { id: String(Date.now()), ...doc };
    }
    events.push(record);
    sortEvents();
    res.json({ success: true, event: record });
  });

  // Full update, e.g. after reviewing the clip again and correcting the ducks
  app.put("/mating-events/:id", async (req, res) => {
    const index = events.findIndex((e) => e.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "event not found" });
    const { event, error } = validateEvent(req.body);
    if (error) return res.status(400).json({ error });
    const update = { ...event, updatedAt: new Date().toISOString() };
    if (eventsCol) {
      if (!ObjectId.isValid(req.params.id))
        return res.status(404).json({ error: "event not found" });
      try {
        await eventsCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
      } catch (err) {
        return storageError(res, err, "update mating event");
      }
    }
    events[index] = { ...events[index], ...update };
    sortEvents();
    res.json({ success: true, event: events.find((e) => e.id === req.params.id) });
  });

  app.delete("/mating-events/:id", async (req, res) => {
    const index = events.findIndex((e) => e.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "event not found" });
    if (eventsCol) {
      if (!ObjectId.isValid(req.params.id))
        return res.status(404).json({ error: "event not found" });
      try {
        await eventsCol.deleteOne({ _id: new ObjectId(req.params.id) });
      } catch (err) {
        return storageError(res, err, "delete mating event");
      }
    }
    events.splice(index, 1);
    res.json({ success: true });
  });
}

module.exports = { initRecords, registerRecordRoutes };
