-- matchfoundr · MCP external action audit
-- User-visible history for confirmed external writes; tokens stay service-role only.

create table if not exists public.mcp_action_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connector_id text not null,
  action text not null,
  target text,
  status text not null check (status in ('success', 'error', 'blocked')),
  request jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

grant select on public.mcp_action_logs to authenticated;
grant all on public.mcp_action_logs to service_role;

alter table public.mcp_action_logs enable row level security;

drop policy if exists "Users see own MCP action logs" on public.mcp_action_logs;
create policy "Users see own MCP action logs"
  on public.mcp_action_logs for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_mcp_action_logs_user_created
  on public.mcp_action_logs(user_id, created_at desc);

create index if not exists idx_mcp_action_logs_connector_created
  on public.mcp_action_logs(connector_id, created_at desc);
