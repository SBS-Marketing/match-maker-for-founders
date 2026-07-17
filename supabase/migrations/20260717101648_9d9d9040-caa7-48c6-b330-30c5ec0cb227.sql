alter table public.community_events
  add column if not exists image_url text
    generated always as (banner_image_url) stored;