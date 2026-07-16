create table if not exists public.community_events (
  id text primary key,
  title text not null,
  kind text not null default 'Event',
  service_id text not null default 'growth',
  starts_at timestamptz,
  date_label text,
  time_label text,
  city text,
  venue text,
  spots integer not null default 0 check (spots >= 0),
  taken integer not null default 0 check (taken >= 0),
  host text,
  blurb text,
  agenda text[] not null default '{}',
  banner_image_url text,
  image_url text,
  banner_url text,
  cover_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_events enable row level security;

drop policy if exists "Published community events are readable" on public.community_events;
create policy "Published community events are readable"
  on public.community_events for select
  using (is_published = true);

create index if not exists community_events_published_starts_idx
  on public.community_events (is_published, starts_at asc);
