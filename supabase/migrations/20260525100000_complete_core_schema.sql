-- ─────────────────────────────────────────────────────────────
-- matchfoundr · Issue #10 — Vollständiges Core Schema + RLS
-- Tabellen: profiles (Erweiterung), projects, conversations,
--           profile_embeddings, match_results (Erweiterung)
-- Trigger: updated_at, new_user_profile, last_active
-- RLS: Alle Core-Tabellen abgesichert
-- ─────────────────────────────────────────────────────────────

-- ═════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ═════════════════════════════════════════════════════════════

create type if not exists public.match_status as enum ('pending', 'accepted', 'declined', 'blocked');
create type if not exists public.message_status as enum ('sent', 'delivered', 'read');
create type if not exists public.project_stage as enum ('idea', 'prototype', 'mvp', 'revenue', 'scaling');
create type if not exists public.availability_type as enum ('full_time', 'part_time', 'freelance', 'open');

-- ═════════════════════════════════════════════════════════════
-- 2. PROFILES ERWEITERUNG
-- ═════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists bio               text,
  add column if not exists lat               double precision,
  add column if not exists lng               double precision,
  add column if not exists city              text,
  add column if not exists country           text default 'DE',
  add column if not exists max_distance_km   integer default 50,
  add column if not exists embedding         vector(384),  -- all-MiniLM-L6-v2
  add column if not exists email             text,
  add column if not exists phone             text,
  add column if not exists linkedin_url      text,
  add column if not exists github_url        text,
  add column if not exists website_url       text,
  add column if not exists availability      public.availability_type default 'open',
  add column if not exists years_experience  integer default 0,
  add column if not exists is_onboarded      boolean default false,
  add column if not exists onboarding_step   integer default 0;

-- GIST Index für Geodaten (falls PostGIS nicht verfügbar, nutzen wir plain)
create index if not exists idx_profiles_location on public.profiles(lat, lng) where lat is not null and lng is not null;
create index if not exists idx_profiles_city on public.profiles(city);
create index if not exists idx_profiles_onboarded on public.profiles(is_onboarded, is_visible) where is_onboarded = true and is_visible = true;

-- ═════════════════════════════════════════════════════════════
-- 3. PROJECTS
-- ═════════════════════════════════════════════════════════════

create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  problem       text,
  solution      text,
  stage         public.project_stage default 'idea',
  industry      text,
  tags          text[] default '{}',
  website_url   text,
  pitch_deck_url text,
  logo_url      text,
  is_looking_for text[] default '{}',  -- z.B. ['tech', 'business', 'design']
  is_public     boolean default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.projects is 'Projekte/Startups der Founder';

-- ═════════════════════════════════════════════════════════════
-- 4. CONVERSATIONS (Chat-Threads)
-- ═════════════════════════════════════════════════════════════

create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid references public.mutual_matches(id) on delete set null,
  user_a          uuid not null references public.profiles(id) on delete cascade,
  user_b          uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count_a  integer default 0,
  unread_count_b  integer default 0,
  is_active       boolean default true,
  created_at      timestamptz not null default now(),

  unique (user_a, user_b),
  check (user_a < user_b)
);

comment on table public.conversations is 'Chat-Konversationen zwischen gematchten Foundern';

-- ═════════════════════════════════════════════════════════════
-- 5. MESSAGES ERWEITERUNG
-- ═════════════════════════════════════════════════════════════

alter table public.messages
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade,
  add column if not exists status public.message_status default 'sent',
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null,
  add column if not exists attachments jsonb default '[]',
  add column if not exists edited_at timestamptz,
  add column if not exists is_deleted boolean default false;

-- Index für Conversation-Lookup
 create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at desc);
 create index if not exists idx_messages_match on public.messages(match_id, created_at desc);

-- ═════════════════════════════════════════════════════════════
-- 6. PROFILE EMBEDDINGS (für Matching-Algorithmus)
-- ═════════════════════════════════════════════════════════════

create table if not exists public.profile_embeddings (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  embedding     vector(384) not null,
  content_hash  text not null,  -- Hash des Profiltexts zur Invalidierung
  model         text default 'all-MiniLM-L6-v2',
  created_at    timestamptz not null default now(),

  unique (profile_id)
);

comment on table public.profile_embeddings is 'Semantische Embeddings für AI-Matching';

-- HNSW Index für schnelle Similarity-Search (pgvector)
create index if not exists idx_profile_embeddings_vector
  on public.profile_embeddings using hnsw (embedding vector_cosine_ops);

-- ═════════════════════════════════════════════════════════════
-- 7. MATCH RESULTS ERWEITERUNG
-- ═════════════════════════════════════════════════════════════

alter table public.match_results
  add column if not exists skill_overlap_score numeric(5,2) default 0,
  add column if not exists location_score numeric(5,2) default 0,
  add column if not exists embedding_score numeric(5,2) default 0,
  add column if not exists combined_score numeric(5,2) default 0,
  add column if not exists explanation jsonb default '{}',
  add column if not exists is_hidden boolean default false;

-- ═════════════════════════════════════════════════════════════
-- 8. MUTUAL MATCHES ERWEITERUNG
-- ═════════════════════════════════════════════════════════════

alter table public.mutual_matches
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

-- ═════════════════════════════════════════════════════════════
-- 9. TRIGGER: updated_at
-- ═════════════════════════════════════════════════════════════

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger if not exists trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════
-- 10. TRIGGER: Neuer User → Profile anlegen
-- ═════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (
    id,
    display_name,
    email,
    photo_url,
    created_at,
    updated_at
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    email = excluded.email,
    photo_url = coalesce(excluded.photo_url, public.profiles.photo_url),
    updated_at = now();

  -- Default-Rolle zuweisen
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end $$;

-- Nur anlegen wenn nicht existiert
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_auth_users_insert'
  ) then
    create trigger trg_auth_users_insert
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- ═════════════════════════════════════════════════════════════
-- 11. TRIGGER: last_active bei jeder Auth-Aktion
-- ═════════════════════════════════════════════════════════════

create or replace function public.update_last_active()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set last_active = now() where id = new.user_id;
  return new;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_auth_sessions_insert'
  ) then
    create trigger trg_auth_sessions_insert
      after insert on auth.sessions
      for each row execute function public.update_last_active();
  end if;
end $$;

-- ═════════════════════════════════════════════════════════════
-- 12. RLS — ENABLE
-- ═════════════════════════════════════════════════════════════

alter table public.profiles           enable row level security;
alter table public.projects           enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.profile_embeddings enable row level security;
alter table public.matches            enable row level security;
alter table public.swipes             enable row level security;
alter table public.founder_skills     enable row level security;
alter table public.mutual_matches     enable row level security;
alter table public.match_results      enable row level security;
alter table public.match_interactions enable row level security;
alter table public.user_roles         enable row level security;

-- ═════════════════════════════════════════════════════════════
-- 13. RLS — PROFILES
-- ═════════════════════════════════════════════════════════════

create policy if not exists "Profiles: public read"
  on public.profiles for select using (true);

create policy if not exists "Profiles: own write"
  on public.profiles for update using (auth.uid() = id);

-- ═════════════════════════════════════════════════════════════
-- 14. RLS — PROJECTS
-- ═════════════════════════════════════════════════════════════

create policy if not exists "Projects: public read"
  on public.projects for select using (is_public = true);

create policy if not exists "Projects: founder full access"
  on public.projects for all using (auth.uid() = founder_id);

-- ═════════════════════════════════════════════════════════════
-- 15. RLS — CONVERSATIONS
-- ═════════════════════════════════════════════════════════════

create policy if not exists "Conversations: participants only"
  on public.conversations for all
  using (auth.uid() = user_a or auth.uid() = user_b);

-- ═════════════════════════════════════════════════════════════
-- 16. RLS — MESSAGES
-- ═════════════════════════════════════════════════════════════

create policy if not exists "Messages: participants read"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
    or exists (
      select 1 from public.mutual_matches m
      where m.id = messages.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy if not exists "Messages: sender insert"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy if not exists "Messages: sender update own"
  on public.messages for update
  using (auth.uid() = sender_id);

-- ═════════════════════════════════════════════════════════════
-- 17. RLS — SWIPES
-- ═════════════════════════════════════════════════════════════

create policy if not exists "Swipes: own read"
  on public.swipes for select using (auth.uid() = swiper_id);

create policy if not exists "Swipes: own insert"
  on public.swipes for insert with check (auth.uid() = swiper_id);

-- ═════════════════════════════════════════════════════════════
-- 18. RLS — MATCHES / MUTUAL_MATCHES
-- ═════════════════════════════════════════════════════════════

create policy if not exists "Matches: participants read"
  on public.matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy if not exists "Mutual matches: participants read"
  on public.mutual_matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- ═════════════════════════════════════════════════════════════
-- 19. RLS — FOUNDER_SKILLS
-- ═════════════════════════════════════════════════════════════

create policy if not exists "Founder skills: public read"
  on public.founder_skills for select using (true);

create policy if not exists "Founder skills: own write"
  on public.founder_skills for all using (auth.uid() = user_id);

-- ═════════════════════════════════════════════════════════════
-- 20. RLS — PROFILE_EMBEDDINGS (nur Service-Role / eigener User)
-- ═════════════════════════════════════════════════════════════

create policy if not exists "Embeddings: own read"
  on public.profile_embeddings for select using (auth.uid() = profile_id);

-- ═════════════════════════════════════════════════════════════
-- 21. RLS — USER_ROLES
-- ═════════════════════════════════════════════════════════════

create policy if not exists "User roles: own read"
  on public.user_roles for select using (auth.uid() = user_id);

-- ═════════════════════════════════════════════════════════════
-- 22. RLS — MATCH_RESULTS / INTERACTIONS
-- ═════════════════════════════════════════════════════════════

create policy if not exists "Match results: own read"
  on public.match_results for select using (auth.uid() = user_id);

create policy if not exists "Match interactions: own write"
  on public.match_interactions for all using (auth.uid() = user_id);

-- ═════════════════════════════════════════════════════════════
-- 23. HILFSFUNKTION: Distanzberechnung (Haversine)
-- ═════════════════════════════════════════════════════════════

create or replace function public.distance_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
)
returns double precision language sql immutable as $$
  select 6371 * acos(
    least(1.0, greatest(-1.0,
      cos(radians(lat1)) * cos(radians(lat2)) *
      cos(radians(lng2) - radians(lng1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    ))
  )
$$;

-- ═════════════════════════════════════════════════════════════
-- 24. HILFSFUNKTION: Match-Score berechnen (SQL-Version)
-- ═════════════════════════════════════════════════════════════

create or replace function public.compute_match_score(
  p1 uuid, p2 uuid
)
returns jsonb language plpgsql security definer as $$
declare
  rec1 record;
  rec2 record;
  skill_score numeric := 0;
  loc_score numeric := 0;
  emb_score numeric := 0;
  total numeric := 0;
  dist_km double precision;
  common_skills integer;
  total_skills integer;
begin
  select * into rec1 from public.profiles where id = p1;
  select * into rec2 from public.profiles where id = p2;

  if rec1 is null or rec2 is null then
    return jsonb_build_object('error', 'Profile nicht gefunden');
  end if;

  -- Skill-Overlap
  common_skills := coalesce(array_length(
    array(select unnest(rec1.skills) intersect select unnest(rec2.skills)), 1
  ), 0);
  total_skills := greatest(coalesce(array_length(rec1.skills, 1), 0) + coalesce(array_length(rec2.skills, 1), 0), 1);
  skill_score := least((common_skills::numeric / (total_skills::numeric / 2)) * 100, 100);

  -- Location
  if rec1.lat is not null and rec2.lat is not null then
    dist_km := public.distance_km(rec1.lat, rec1.lng, rec2.lat, rec2.lng);
    loc_score := greatest(0, 100 - (dist_km / rec1.max_distance_km * 100));
  else
    loc_score := 50;  -- Neutral wenn keine Location
  end if;

  -- Embedding (Cosine Similarity via pgvector)
  select (1 - (e1.embedding <=> e2.embedding)) * 100 into emb_score
  from public.profile_embeddings e1, public.profile_embeddings e2
  where e1.profile_id = p1 and e2.profile_id = p2;

  if emb_score is null then emb_score := 50; end if;

  -- Gewichtung: Skills 40%, Location 30%, Embedding 30%
  total := skill_score * 0.4 + loc_score * 0.3 + emb_score * 0.3;

  return jsonb_build_object(
    'total', round(total, 2),
    'skill_score', round(skill_score, 2),
    'location_score', round(loc_score, 2),
    'embedding_score', round(emb_score, 2),
    'distance_km', round(coalesce(dist_km, 0)::numeric, 2)
  );
end $$;
