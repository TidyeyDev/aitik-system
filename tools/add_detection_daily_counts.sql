-- Per-day detection counts for the Detections calendar, computed in the database
-- so they cover every row. Read-only: nothing about how detections are stored changes.
-- Returns one JSON object ({"2026-10-29": 42, ...}) so no row limit applies. Safe to re-run.
create or replace function public.detection_daily_counts(
  p_tz text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_behavior text default null
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(day, n), '{}'::jsonb)
  from (
    select (created_at at time zone p_tz)::date as day, count(*) as n
    from public.detections
    where (p_from is null or created_at >= p_from)
      and (p_to is null or created_at < p_to)
      and (p_behavior is null or behavior ilike p_behavior)
    group by 1
  ) days;
$$;
