-- Co-Pilot Schema
create table if not exists public.copilot_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Neue Session',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.copilot_context (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.copilot_sessions(id) on delete cascade,
  role text, idea text, stage text, city text, goal text, risk text,
  raw_context jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.copilot_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.copilot_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  model_used text,
  sources jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.copilot_sessions(id) on delete set null,
  title text not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'done', 'missed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.copilot_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.copilot_sessions(id) on delete set null,
  type text not null check (type in (
    'exist_antrag', 'profit_antrag', 'nda', 'email_advisor',
    'email_cofounder', 'email_investor', 'email_exist_uni',
    'pitch_outline', 'finanzplan', 'custom'
  )),
  title text not null,
  content text not null,
  draft_content text,
  fill_pct integer default 0,
  status text not null default 'draft' check (status in ('draft', 'ready', 'sent')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advisor_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.copilot_sessions(id) on delete set null,
  advisor_id uuid references public.profiles(id) on delete cascade,
  fit_score integer check (fit_score between 0 and 100),
  reasons jsonb,
  created_at timestamptz not null default now()
);

alter table public.copilot_sessions enable row level security;
alter table public.copilot_context enable row level security;
alter table public.copilot_messages enable row level security;
alter table public.deadlines enable row level security;
alter table public.copilot_documents enable row level security;
alter table public.advisor_recommendations enable row level security;

create policy "Users manage own sessions" on public.copilot_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own context" on public.copilot_context for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own messages" on public.copilot_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own deadlines" on public.deadlines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own documents" on public.copilot_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users view own recommendations" on public.advisor_recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_copilot_sessions_user on public.copilot_sessions(user_id);
create index if not exists idx_copilot_messages_session on public.copilot_messages(session_id);
create index if not exists idx_copilot_context_user on public.copilot_context(user_id);
create index if not exists idx_deadlines_user_due on public.deadlines(user_id, due_date);
create index if not exists idx_documents_user on public.copilot_documents(user_id);