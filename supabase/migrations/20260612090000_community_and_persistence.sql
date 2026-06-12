-- ═══════════════════════════════════════════════════════════════════════════
-- matchfoundr · Community & Persistenz
-- 1) Öffentliche Firmenprofile  2) Profil-Extras  3) Founder-Feed
-- 4) Community-Fragen           5) Partner-Bewerbungen  6) Media-Storage
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Firmenprofile (Block-Kompositionen, optional öffentlich) ─────────────
create table if not exists public.company_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles(id) on delete cascade,
  slug        text not null unique,
  name        text not null,
  composition jsonb not null default '{}'::jsonb,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.company_profiles enable row level security;

create policy "Owners manage own company profile"
  on public.company_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Veröffentlichte Profile sind die Werbefläche — für alle lesbar (auch anonym).
create policy "Published company profiles are public"
  on public.company_profiles for select
  to anon, authenticated
  using (published = true);

create index if not exists idx_company_profiles_slug on public.company_profiles(slug);

create trigger company_profiles_updated_at
  before update on public.company_profiles
  for each row execute function public.set_updated_at();

-- ── 2. Profil-Extras (LinkedIn-Style Felder) ───────────────────────────────
alter table public.profiles
  add column if not exists headline   text,
  add column if not exists banner_url text,
  add column if not exists socials    jsonb not null default '[]'::jsonb;

-- ── 3. Founder-Feed (Community-Aktivitäten) ────────────────────────────────
create table if not exists public.activity_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in (
                'profile_published', 'grant_saved', 'question_asked',
                'milestone', 'joined'
              )),
  title       text not null,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.activity_events enable row level security;

create policy "Users insert own activity"
  on public.activity_events for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Feed ist Community-sichtbar (eingeloggt).
create policy "Authenticated read activity feed"
  on public.activity_events for select
  to authenticated
  using (true);

create index if not exists idx_activity_events_created on public.activity_events(created_at desc);

-- ── 4. Community-Fragen + Antworten ────────────────────────────────────────
create table if not exists public.community_questions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  body           text,
  copilot_answer text,
  created_at     timestamptz not null default now()
);

create table if not exists public.community_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.community_questions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table public.community_questions enable row level security;
alter table public.community_answers enable row level security;

create policy "Authenticated read questions"
  on public.community_questions for select to authenticated using (true);
create policy "Users ask own questions"
  on public.community_questions for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own questions"
  on public.community_questions for update to authenticated using (auth.uid() = user_id);

create policy "Authenticated read answers"
  on public.community_answers for select to authenticated using (true);
create policy "Users write own answers"
  on public.community_answers for insert to authenticated with check (auth.uid() = user_id);

create index if not exists idx_community_questions_created
  on public.community_questions(created_at desc);
create index if not exists idx_community_answers_question
  on public.community_answers(question_id);

-- ── 5. Partner-Bewerbungen (Anwälte, Steuerberater, Mentoren …) ────────────
create table if not exists public.partner_applications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  service     text not null,
  firm        text,
  message     text,
  status      text not null default 'new' check (status in ('new', 'reviewed', 'accepted', 'rejected')),
  created_at  timestamptz not null default now()
);

alter table public.partner_applications enable row level security;

-- Bewerben darf jeder (auch ohne Konto), lesen nur Admins.
create policy "Anyone can apply as partner"
  on public.partner_applications for insert
  to anon, authenticated
  with check (true);

create policy "Admins read partner applications"
  on public.partner_applications for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ── 6. Media-Storage (Bilder für Firma-Builder, Banner, Avatare) ───────────
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "Users upload to own media folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update own media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Media is publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');
