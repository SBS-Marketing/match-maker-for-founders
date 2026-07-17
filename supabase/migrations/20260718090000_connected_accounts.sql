-- ═══════════════════════════════════════════════════════════════════════════
-- matchfoundr · Konten-Verknüpfung + Morgenreport + WhatsApp-Inbox
-- 1) connected_accounts — welcher Nutzer hat welchen Dienst verbunden (Status,
--    Label). Tokens liegen GETRENNT in account_tokens (nur Service Role).
-- 2) account_tokens    — OAuth-Tokens, keine Policies → nur Edge Functions.
-- 3) daily_reports     — der 8-Uhr-Morgenreport des Co-Piloten pro Tag.
-- 4) whatsapp_messages — Inbox für das open-wa Gateway (Webhook).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Verknüpfte Konten ────────────────────────────────────────────────────
create table if not exists public.connected_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  provider      text not null check (provider in ('gmail', 'google_calendar', 'whatsapp')),
  status        text not null default 'connected' check (status in ('connected', 'pending', 'error')),
  account_label text,                    -- z.B. die verknüpfte E-Mail-Adresse
  meta          jsonb not null default '{}'::jsonb,
  connected_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.connected_accounts enable row level security;

create policy "Users see own connections"
  on public.connected_accounts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users disconnect own accounts"
  on public.connected_accounts for delete
  to authenticated
  using (auth.uid() = user_id);

-- Google-Verknüpfungen schreibt nur die Edge Function (Service Role).
-- WhatsApp darf der Nutzer selbst anstoßen (Gateway-Setup folgt separat).
create policy "Users request whatsapp connection"
  on public.connected_accounts for insert
  to authenticated
  with check (auth.uid() = user_id and provider = 'whatsapp');

-- ── 2. OAuth-Tokens (streng getrennt, kein Client-Zugriff) ──────────────────
create table if not exists public.account_tokens (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  provider      text not null,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (user_id, provider)
);

-- RLS an, KEINE Policies: ausschließlich Service Role (Edge Functions) kommt ran.
alter table public.account_tokens enable row level security;

-- ── 3. Morgenreports ────────────────────────────────────────────────────────
create table if not exists public.daily_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  report_date date not null default current_date,
  content     jsonb not null default '{}'::jsonb,
  -- content: { fokus, tagesablauf:[{zeit,titel}], wichtige_mails:[{von,betreff,warum}],
  --            draft_vorschlaege:[{an,betreff,entwurf,gmail_draft_id}],
  --            erkannte_termine:[{titel,datum,zeit,quelle,calendar_event_id}], whatsapp:{neue,hinweis} }
  created_at  timestamptz not null default now(),
  unique (user_id, report_date)
);

alter table public.daily_reports enable row level security;

create policy "Users read own reports"
  on public.daily_reports for select
  to authenticated
  using (auth.uid() = user_id);

-- ── 4. WhatsApp-Inbox (open-wa Gateway → Webhook) ───────────────────────────
create table if not exists public.whatsapp_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  wa_from     text not null,             -- Absender (Nummer/JID)
  wa_name     text,
  body        text not null,
  direction   text not null default 'in' check (direction in ('in', 'out')),
  received_at timestamptz not null default now()
);

alter table public.whatsapp_messages enable row level security;

create policy "Users read own whatsapp"
  on public.whatsapp_messages for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_whatsapp_received on public.whatsapp_messages(received_at desc);
create index if not exists idx_daily_reports_date on public.daily_reports(report_date desc);
