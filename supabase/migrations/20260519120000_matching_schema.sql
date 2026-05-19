-- ─────────────────────────────────────────────────────────────
-- matchfoundr · Matching & Services Schema
-- ─────────────────────────────────────────────────────────────

-- 1. SERVICES — Dienstleister, Förderprogramme, Kammern etc.
create table if not exists public.services (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in (
                  'law_firm', 'tax_advisor', 'accelerator', 'coworking',
                  'funding_program', 'bank', 'agency', 'coach', 'chamber',
                  'event', 'community'
                )),
  name          text not null,
  description   text,
  industries    jsonb not null default '["all"]',  -- ["tech", "handwerk"] or ["all"]
  stages        jsonb not null default '["all"]',  -- ["Idee", "MVP"] or ["all"]
  cities        jsonb not null default '[]',
  remote        boolean not null default false,
  tags          jsonb not null default '[]',       -- ["EXIST", "GmbH-Gründung", ...]
  price_tier    text not null default 'free' check (price_tier in ('free','low','medium','premium')),
  website_url   text,
  contact_email text,
  logo_url      text,
  verified      boolean not null default false,
  rating        numeric(2,1) check (rating between 0 and 5),
  review_count  integer default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. MATCH RESULTS — cached scores, refreshed nightly
create table if not exists public.match_results (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  target_id       uuid not null,             -- profile_id or service_id
  target_type     text not null check (target_type in ('cofounder', 'advisor', 'service')),
  total_score     integer not null check (total_score between 0 and 100),
  dimension_scores jsonb not null default '{}', -- { skill_complementarity: 85, ... }
  badges          jsonb not null default '[]',  -- ["Skill-Fit", "Gleiche Stadt"]
  dealbreaker     boolean not null default false,
  dealbreaker_reason text,
  computed_at     timestamptz not null default now(),

  unique (user_id, target_id, target_type)
);

-- 3. MATCH INTERACTIONS — track swipes/likes/passes
create table if not exists public.match_interactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  target_id   uuid not null,
  target_type text not null check (target_type in ('cofounder', 'advisor', 'service')),
  action      text not null check (action in ('like', 'pass', 'superlike', 'contact')),
  created_at  timestamptz not null default now(),

  unique (user_id, target_id, target_type)
);

-- 4. MUTUAL MATCHES — when both sides liked each other (cofounder only)
create table if not exists public.mutual_matches (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references public.profiles(id) on delete cascade,
  user_b      uuid not null references public.profiles(id) on delete cascade,
  score_a     integer,   -- score A gave B
  score_b     integer,   -- score B gave A
  avg_score   integer,   -- average
  status      text not null default 'new' check (status in ('new', 'contacted', 'meeting', 'active', 'declined')),
  created_at  timestamptz not null default now(),

  unique (user_a, user_b),
  check (user_a < user_b)  -- prevent duplicates in both directions
);

-- 5. SERVICE SAVES — bookmarked services
create table if not exists public.service_saves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  created_at  timestamptz not null default now(),

  unique (user_id, service_id)
);

-- ─────────────────────────────────────────────────────────────
-- PROFILE EXTENSIONS
-- ─────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists industry       text,
  add column if not exists venture_term   text,
  add column if not exists partner_term   text,
  add column if not exists founder_type   text check (founder_type in ('founder', 'talent', 'hybrid')),
  add column if not exists is_advisor     boolean default false,
  add column if not exists is_visible     boolean default true,  -- opt-out of matching
  add column if not exists last_active    timestamptz default now();

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────

alter table public.services            enable row level security;
alter table public.match_results       enable row level security;
alter table public.match_interactions  enable row level security;
alter table public.mutual_matches      enable row level security;
alter table public.service_saves       enable row level security;

-- Services: anyone can read, only admins write
create policy "Services are public"
  on public.services for select using (true);

-- Match results: user sees own
create policy "Users see own match results"
  on public.match_results for all using (auth.uid() = user_id);

-- Interactions: user manages own
create policy "Users manage own interactions"
  on public.match_interactions for all using (auth.uid() = user_id);

-- Mutual matches: both parties see it
create policy "Users see own mutual matches"
  on public.mutual_matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Service saves: user manages own
create policy "Users manage own service saves"
  on public.service_saves for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────

create index if not exists idx_match_results_user_score
  on public.match_results(user_id, total_score desc);

create index if not exists idx_match_results_type
  on public.match_results(user_id, target_type, total_score desc);

create index if not exists idx_interactions_user
  on public.match_interactions(user_id, target_type);

create index if not exists idx_mutual_matches_users
  on public.mutual_matches(user_a, user_b);

create index if not exists idx_services_type
  on public.services(type, verified);
