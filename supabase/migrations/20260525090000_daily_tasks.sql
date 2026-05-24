-- ─────────────────────────────────────────────────────────────
-- matchfoundr · Daily Tasks
-- Persistiert den personalisierten /heute Überblick pro User und Tag.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.daily_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  task_date   date not null default current_date,
  task_key    text not null,
  service     text not null,
  title       text not null,
  description text not null,
  href        text not null,
  label       text,
  urgency     text not null default 'medium' check (urgency in ('high', 'medium', 'low')),
  minutes     integer not null default 15,
  status      text not null default 'open' check (status in ('open', 'done', 'snoozed')),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, task_date, task_key)
);

alter table public.daily_tasks enable row level security;

create policy "Users manage own daily tasks"
  on public.daily_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_daily_tasks_user_date
  on public.daily_tasks(user_id, task_date, status);

create trigger daily_tasks_updated_at
  before update on public.daily_tasks
  for each row execute function public.set_updated_at();
