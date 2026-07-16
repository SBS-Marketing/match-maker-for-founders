-- Events created through admin tools should be visible in the iOS app unless
-- explicitly saved as drafts. Public read access still only returns published rows.
alter table public.community_events
  alter column is_published set default true;

-- The generated policy mixed public event reads with the admin helper
-- has_role(). anon users cannot execute that helper, so public event reads
-- failed before Postgres could return published rows.
drop policy if exists "Public can read published events" on public.community_events;
drop policy if exists "Published community events are readable" on public.community_events;
drop policy if exists "Admins can read community events" on public.community_events;

create policy "Published community events are readable"
  on public.community_events for select
  to anon, authenticated
  using (is_published = true);

create policy "Admins can read community events"
  on public.community_events for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));
