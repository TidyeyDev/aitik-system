/**
 * One-time migration: copy detections from MongoDB → Supabase
 * Run from Render Shell:  node migrate.js
 *
 * Requires MONGODB_URI, SUPABASE_URL, SUPABASE_ANON_KEY env vars (already set on Render).
 */

const { MongoClient } = require("mongodb");
const { createClient } = require("@supabase/supabase-js");

async function migrate() {
  const mongoUri = process.env.MONGODB_URI;
  const sbUrl    = process.env.SUPABASE_URL;
  const sbKey    = process.env.SUPABASE_ANON_KEY;

  if (!mongoUri) { console.error("MONGODB_URI not set"); process.exit(1); }
  if (!sbUrl || !sbKey) { console.error("SUPABASE_URL / SUPABASE_ANON_KEY not set"); process.exit(1); }

  // ── Connect ──────────────────────────────────────────────────────────────
  console.log("Connecting to MongoDB…");
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DB || "aitik");

  const supabase = createClient(sbUrl, sbKey);

  // ── Fetch all detections from Mongo ──────────────────────────────────────
  console.log("Fetching detections from MongoDB…");
  const docs = await db.collection("detections")
    .find()
    .sort({ timestamp: 1 })
    .toArray();
  console.log(`Found ${docs.length} detections in MongoDB.`);

  if (docs.length === 0) {
    console.log("Nothing to migrate.");
    await mongo.close();
    return;
  }

  // ── Check what's already in Supabase (avoid duplicates) ──────────────────
  const { count } = await supabase
    .from("detections")
    .select("*", { count: "exact", head: true });
  console.log(`Supabase already has ${count ?? 0} rows.`);

  // ── Insert in batches of 200 ──────────────────────────────────────────────
  const BATCH = 200;
  let inserted = 0;
  let skipped  = 0;

  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH).map((d) => ({
      behavior:   d.behavior   ?? null,
      confidence: d.confidence != null ? Number(d.confidence) : null,
      camera_id:  d.camera     ?? null,
      snapshot:   d.snapshot   ?? null,
      bbox:       d.bbox       ?? null,
      created_at: d.timestamp  ?? d.capturedAt ?? new Date().toISOString(),
    }));

    const { error } = await supabase.from("detections").insert(batch);
    if (error) {
      console.error(`Batch ${i}–${i + BATCH} failed:`, error.message);
      skipped += batch.length;
    } else {
      inserted += batch.length;
      console.log(`  Inserted rows ${i + 1}–${Math.min(i + BATCH, docs.length)}`);
    }
  }

  console.log(`\nDone. Inserted: ${inserted}  Skipped/failed: ${skipped}`);
  await mongo.close();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
