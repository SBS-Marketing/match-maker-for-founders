alter table public.community_events
  add column if not exists source_url text,
  add column if not exists booking_url text;
