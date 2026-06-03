-- ─────────────────────────────────────────────────────────────
-- matchfoundr · Benachrichtigungs-Einstellungen
-- Steuert u.a. den täglichen E-Mail-Digest (daily-digest Edge Function).
-- Fehlende Zeile = opted-in (Default true).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.notification_prefs (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  daily_digest boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create policy "Users manage own notification prefs"
  on public.notification_prefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger notification_prefs_updated_at
  before update on public.notification_prefs
  for each row execute function public.set_updated_at();
