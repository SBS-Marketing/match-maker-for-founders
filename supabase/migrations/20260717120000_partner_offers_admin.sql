-- matchfoundr · Admins verwalten den Partner-Katalog (Entdecken-Sektion)
-- Bisher gab es nur die öffentliche Lese-Policy (is_active = true).
-- Admins dürfen alles sehen (auch deaktivierte) und schreiben.

drop policy if exists "Admins manage partner offers" on public.partner_offers;
create policy "Admins manage partner offers"
  on public.partner_offers for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

grant insert, update, delete on public.partner_offers to authenticated;
