// Mating events logged by hand from the recordings: a video link plus a few
// details. The model detects the behaviour; researchers name the ducks.

const { ObjectId } = require("mongodb");

let events = []; // newest first
let eventsCol = null;

function fromDoc(doc) {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

async function initRecords(db) {
  // The collection is only kept once loading worked, so a failure here
  // leaves the module in memory mode instead of half-connected.
  const col = db.collection("matingEvents");
  await col.createIndex({ occurredAt: -1 });
  events = (await col.find().sort({ occurredAt: -1 }).toArray()).map(fromDoc);
  eventsCol = col;
  return { events: events.length };
}

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Returns { event } or { error }
function validateEvent(body) {
  const videoUrl = cleanText(body.videoUrl, 2000);
  let url = null;
  try {
    url = new URL(videoUrl);
  } catch {}
  if (!url || !["http:", "https:"].includes(url.protocol))
    return { error: "video link must start with http:// or https://" };

  const occurred = new Date(body.occurredAt);
  if (typeof body.occurredAt !== "string" || Number.isNaN(occurred.getTime()))
    return { error: "date and time are required" };

  return {
    event: {
      videoUrl,
      occurredAt: occurred.toISOString(),
      females: cleanText(body.females, 120),
      notes: cleanText(body.notes, 500),
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
