-- matchfoundr · Admin-managed AI token grants
-- Admins can assign an AI token budget per user. If a user has no grant yet,
-- the Co-Pilot keeps the existing behavior; once a grant exists, it is enforced.

create table if not exists public.ai_token_grants (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  token_limit  integer not null default 8000 check (token_limit >= 0),
  tokens_used  integer not null default 0 check (tokens_used >= 0),
  period       text not null default 'monthly' check (period in ('daily', 'weekly', 'monthly', 'manual')),
  resets_at    timestamptz,
  note         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.ai_token_grants enable row level security;

drop policy if exists "Admins manage ai token grants" on public.ai_token_grants;
create policy "Admins manage ai token grants"
  on public.ai_token_grants for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Users read own ai token grant" on public.ai_token_grants;
create policy "Users read own ai token grant"
  on public.ai_token_grants for select
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.ai_token_grants to authenticated;
grant all on public.ai_token_grants to service_role;

drop trigger if exists ai_token_grants_set_updated_at on public.ai_token_grants;
create trigger ai_token_grants_set_updated_at
  before update on public.ai_token_grants
  for each row execute function public.set_updated_at();

create or replace function public.consume_ai_tokens(p_user_id uuid, p_tokens integer)
returns public.ai_token_grants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ai_token_grants;
begin
  update public.ai_token_grants
     set tokens_used = least(token_limit, tokens_used + greatest(coalesce(p_tokens, 0), 0)),
         updated_at = now()
   where user_id = p_user_id
   returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.consume_ai_tokens(uuid, integer) from public;
grant execute on function public.consume_ai_tokens(uuid, integer) to service_role;
