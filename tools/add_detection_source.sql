-- Run once in the Supabase SQL editor before posting recorded clips or demo samples.
-- Existing rows and live inserts default to 'live'. Safe to re-run.
alter table detections
  add column if not exists source text not null default 'live',
  add column if not exists clip text;

alter table detections drop constraint if exists detections_source_check;
alter table detections
  add constraint detections_source_check check (source in ('live', 'recorded', 'demo'));
