-- matchfoundr · MCP connector accounts
-- Public status lives in mcp_connections; OAuth tokens stay service-role only.

create table if not exists public.mcp_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connector_id text not null check (
    connector_id in (
      'authorities',
      'google_drive',
      'notion',
      'slack',
      'github',
      'commerce',
      'accounting',
      'google_business'
    )
  ),
  status text not null default 'pending' check (
    status in ('connected', 'pending', 'setup_required', 'error')
  ),
  account_label text,
  scopes text[] not null default '{}'::text[],
  capabilities jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, connector_id)
);

grant select, delete on public.mcp_connections to authenticated;
grant all on public.mcp_connections to service_role;

alter table public.mcp_connections enable row level security;

drop policy if exists "Users see own MCP connections" on public.mcp_connections;
create policy "Users see own MCP connections"
  on public.mcp_connections for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users disconnect own MCP connections" on public.mcp_connections;
create policy "Users disconnect own MCP connections"
  on public.mcp_connections for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.mcp_oauth_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  connector_id text not null,
  access_token text not null,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, connector_id)
);

grant all on public.mcp_oauth_tokens to service_role;
alter table public.mcp_oauth_tokens enable row level security;

create index if not exists idx_mcp_connections_user_updated
  on public.mcp_connections(user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mcp_connections_updated on public.mcp_connections;
create trigger mcp_connections_updated
  before update on public.mcp_connections
  for each row execute function public.set_updated_at();

