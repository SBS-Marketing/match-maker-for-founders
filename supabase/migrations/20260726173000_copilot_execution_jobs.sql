create table if not exists public.copilot_execution_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.copilot_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'no_result', 'failed')),
  request_message text not null,
  assignment text not null default '',
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_copilot_execution_jobs_session_status
  on public.copilot_execution_jobs(session_id, status, created_at desc);

grant select on public.copilot_execution_jobs to authenticated;
grant all on public.copilot_execution_jobs to service_role;

alter table public.copilot_execution_jobs enable row level security;

drop policy if exists "Users read own copilot execution jobs"
  on public.copilot_execution_jobs;
create policy "Users read own copilot execution jobs"
  on public.copilot_execution_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

