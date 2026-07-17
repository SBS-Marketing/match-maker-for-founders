alter table public.community_events
  alter column is_published set default true;

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