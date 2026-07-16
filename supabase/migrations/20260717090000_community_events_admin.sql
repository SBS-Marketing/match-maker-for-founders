-- ═══════════════════════════════════════════════════════════════════════════
-- matchfoundr · Community-Events für den Admin-Bereich
-- 1) Admins dürfen community_events verwalten (Anlegen, Bearbeiten, Löschen —
--    bisher gab es nur die öffentliche Lese-Policy für is_published).
-- 2) community_event_registrations — Anmeldungen zu Events (Web + iOS).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Admin-Verwaltung ─────────────────────────────────────────────────────
drop policy if exists "Admins manage community events" on public.community_events;
create policy "Admins manage community events"
  on public.community_events for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ── 2. Anmeldungen ──────────────────────────────────────────────────────────
create table if not exists public.community_event_registrations (
  id         uuid primary key default gen_random_uuid(),
  event_id   text not null references public.community_events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text,
  email      text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.community_event_registrations enable row level security;

create policy "Users register themselves"
  on public.community_event_registrations for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users see own registrations"
  on public.community_event_registrations for select
  to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Users cancel own registration"
  on public.community_event_registrations for delete
  to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create index if not exists idx_community_event_regs_event
  on public.community_event_registrations(event_id);
