-- ═══════════════════════════════════════════════════════════════════════════
-- matchfoundr · Admin & Content
-- 1) ai_usage — Token-/Kosten-Log jeder KI-Anfrage (Admin-Insights)
-- 2) guides   — redaktionelle Guides aus dem Admin (ergänzt statische)
-- Events laufen über community_events (siehe 20260716220000 + 20260717090000).
-- Admin = Zeile in user_roles mit role 'admin' (has_role() existiert bereits).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. KI-Verbrauch ─────────────────────────────────────────────────────────
create table if not exists public.ai_usage (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete set null,
  task              text not null,           -- chat, document_exist, daily_brief …
  model             text not null,           -- moonshotai/kimi-k2.6, anthropic/claude-sonnet-4-6
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,
  cost_usd          numeric(10,6) not null default 0,
  created_at        timestamptz not null default now()
);

alter table public.ai_usage enable row level security;

-- Schreiben macht nur die Edge Function (Service Role, umgeht RLS).
-- Lesen dürfen ausschließlich Admins.
create policy "Admins read ai usage"
  on public.ai_usage for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index if not exists idx_ai_usage_created on public.ai_usage(created_at desc);
create index if not exists idx_ai_usage_task on public.ai_usage(task);

-- ── 2. Guides (Redaktion) ───────────────────────────────────────────────────
create table if not exists public.guides (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  category   text not null check (category in ('gruendung','foerderung','recht','finanzen','team')),
  minutes    integer not null default 5,
  intro      text not null default '',
  sections   jsonb not null default '[]'::jsonb,  -- [{h, body}]
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guides enable row level security;

create policy "Published guides are visible"
  on public.guides for select
  to anon, authenticated
  using (published = true);

create policy "Admins manage guides"
  on public.guides for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger guides_updated_at
  before update on public.guides
  for each row execute function public.set_updated_at();
