-- ─────────────────────────────────────────────────────────────
-- matchfoundr · Co-Pilot Schema
-- ─────────────────────────────────────────────────────────────

-- 1. COPILOT SESSIONS
-- One session per "topic" (e.g. "Plan für Q3-Ausgründung")
create table if not exists public.copilot_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null default 'Neue Session',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. COPILOT CONTEXT
-- Parsed founder context extracted from messages
create table if not exists public.copilot_context (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  session_id  uuid references public.copilot_sessions(id) on delete cascade,
  role        text,           -- "Designer/Product, Solo"
  idea        text,           -- "Buchhaltung für Friseure"
  stage       text,           -- "Prototyp, 2 Monate"
  city        text,           -- "Berlin"
  goal        text,           -- "Ausgründung Q3"
  risk        text,           -- "Förder-Deadline 28.5."
  raw_context jsonb,          -- full parsed JSON from Kimi
  updated_at  timestamptz not null default now()
);

-- 3. COPILOT MESSAGES
-- Full chat history per session
create table if not exists public.copilot_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.copilot_sessions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  model_used  text,           -- "kimi-k2.6" | "claude-sonnet-4-6"
  sources     jsonb,          -- [{type: "PDF", title: "EXIST Förderrichtlinie", url: "..."}]
  created_at  timestamptz not null default now()
);

-- 4. DEADLINES
-- Tracked deadlines extracted by Co-Pilot
create table if not exists public.deadlines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  session_id  uuid references public.copilot_sessions(id) on delete set null,
  title       text not null,          -- "EXIST Förderantrag"
  due_date    date not null,
  status      text not null default 'open' check (status in ('open', 'done', 'missed')),
  priority    text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  notes       text,
  created_at  timestamptz not null default now()
);

-- 5. COPILOT DOCUMENTS
-- Generated documents (Anträge, Briefe, etc.)
create table if not exists public.copilot_documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  session_id    uuid references public.copilot_sessions(id) on delete set null,
  type          text not null check (type in (
                  'exist_antrag', 'profit_antrag', 'nda', 'email_advisor',
                  'email_cofounder', 'email_investor', 'email_exist_uni',
                  'pitch_outline', 'finanzplan', 'custom'
                )),
  title         text not null,
  content       text not null,          -- final Sonnet-polished content
  draft_content text,                   -- raw Kimi draft
  fill_pct      integer default 0,      -- 0-100, how complete the document is
  status        text not null default 'draft' check (status in ('draft', 'ready', 'sent')),
  metadata      jsonb,                  -- extra fields (recipient, program name, etc.)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 6. ADVISOR MATCHES (Co-Pilot Empfehlungen)
create table if not exists public.advisor_recommendations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  session_id  uuid references public.copilot_sessions(id) on delete set null,
  advisor_id  uuid references public.profiles(id) on delete cascade,
  fit_score   integer check (fit_score between 0 and 100),
  reasons     jsonb,   -- [{n: "01", title: "Genau dein Use Case", desc: "..."}]
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- RLS POLICIES — User sieht nur eigene Daten
-- ─────────────────────────────────────────────────────────────

alter table public.copilot_sessions         enable row level security;
alter table public.copilot_context          enable row level security;
alter table public.copilot_messages         enable row level security;
alter table public.deadlines                enable row level security;
alter table public.copilot_documents        enable row level security;
alter table public.advisor_recommendations  enable row level security;

-- Sessions
create policy "Users manage own sessions"
  on public.copilot_sessions for all
  using (auth.uid() = user_id);

-- Context
create policy "Users manage own context"
  on public.copilot_context for all
  using (auth.uid() = user_id);

-- Messages
create policy "Users manage own messages"
  on public.copilot_messages for all
  using (auth.uid() = user_id);

-- Deadlines
create policy "Users manage own deadlines"
  on public.deadlines for all
  using (auth.uid() = user_id);

-- Documents
create policy "Users manage own documents"
  on public.copilot_documents for all
  using (auth.uid() = user_id);

-- Advisor recommendations
create policy "Users view own recommendations"
  on public.advisor_recommendations for all
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────

create index if not exists idx_copilot_sessions_user     on public.copilot_sessions(user_id);
create index if not exists idx_copilot_messages_session  on public.copilot_messages(session_id);
create index if not exists idx_copilot_context_user      on public.copilot_context(user_id);
create index if not exists idx_deadlines_user_due        on public.deadlines(user_id, due_date);
create index if not exists idx_documents_user            on public.copilot_documents(user_id);
