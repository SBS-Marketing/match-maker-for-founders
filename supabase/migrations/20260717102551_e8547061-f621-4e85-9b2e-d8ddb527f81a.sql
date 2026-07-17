create table if not exists public.partner_offers (
  slug text primary key,
  name text not null,
  firm text not null,
  service_id text not null check (service_id in ('capital', 'growth', 'mentor', 'talent', 'tax', 'legal', 'funding')),
  city text not null default 'Remote',
  blurb text not null,
  fit integer not null default 80 check (fit between 0 and 100),
  source_url text,
  booking_url text,
  scrape_status text,
  specialties jsonb not null default '[]'::jsonb,
  packages jsonb not null default '[]'::jsonb,
  why jsonb not null default '[]'::jsonb,
  vouches jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.partner_offers to anon, authenticated;
grant all on public.partner_offers to service_role;

alter table public.partner_offers enable row level security;

drop policy if exists "Partner offers are public" on public.partner_offers;
create policy "Partner offers are public"
  on public.partner_offers for select
  using (is_active = true);

create index if not exists idx_partner_offers_service_fit
  on public.partner_offers(service_id, fit desc)
  where is_active = true;

insert into public.partner_offers (slug, name, firm, service_id, city, blurb, fit, source_url, booking_url, scrape_status, specialties, packages, why, vouches, is_active, updated_at) values
('angel-readiness','Angel Readiness Sprint','matchfoundr Capital Desk','capital','Berlin','Bereitet Angel-Runde, Onepager, Target List und Intro-Material fuer Pre-Seed vor.',86,'https://www.business-angels.de/','https://www.business-angels.de/','ok',
 '[{"label":"Angel-Runde","level":0.96},{"label":"Onepager","level":0.90},{"label":"Target List","level":0.84},{"label":"Intro Prep","level":0.78}]'::jsonb,
 '[{"name":"2 Wochen Sprint","price":"auf Anfrage","desc":"Bereitet Angel-Runde, Onepager, Target List und Intro-Material fuer Pre-Seed vor."},{"name":"Co-Pilot Briefing","price":"inklusive","desc":"Profil, Kontext und offene Fragen werden vor dem Erstgespraech strukturiert."}]'::jsonb,
 '["Passt in die Kategorie capital und ist fuer fruehe Teams vorkuratiert.","Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.","Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
 '[{"from":"matchfoundr","role":"Partner Research","quote":"Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb, true, now()),
('kfw-finance-desk','KfW & Hausbank Finance Desk','matchfoundr Capital Desk','capital','Deutschland','Strukturiert Finanzierungsbedarf, Hausbank-Unterlagen und Foerderkredit-Optionen.',78,'https://www.kfw.de/inlandsfoerderung/Unternehmen/Gr%C3%BCndung-und-Nachfolge/?redirect=780608','https://www.kfw.de/inlandsfoerderung/Unternehmen/Gr%C3%BCnden-Nachfolgen/','ok',
 '[{"label":"KfW","level":0.96},{"label":"Hausbank","level":0.90},{"label":"Liquiditaetsplanung","level":0.84},{"label":"Finanzplan","level":0.78}]'::jsonb,
 '[{"name":"Finanzierungscheck","price":"auf Anfrage","desc":"Strukturiert Finanzierungsbedarf, Hausbank-Unterlagen und Foerderkredit-Optionen."},{"name":"Co-Pilot Briefing","price":"inklusive","desc":"Profil, Kontext und offene Fragen werden vor dem Erstgespraech strukturiert."}]'::jsonb,
 '["Passt in die Kategorie capital und ist fuer fruehe Teams vorkuratiert.","Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.","Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
 '[{"from":"matchfoundr","role":"Partner Research","quote":"Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb, true, now()),
('b2b-sales-motion','B2B Sales Motion','matchfoundr Growth Desk','growth','Remote','ICP, Lead-Listen, Sequenzen und Discovery Script fuer die ersten 30 B2B-Gespraeche.',86,'https://www.apollo.io/startups','https://www.apollo.io/startups','ok',
 '[{"label":"ICP","level":0.96},{"label":"Outbound","level":0.90},{"label":"Discovery","level":0.84},{"label":"CRM","level":0.78}]'::jsonb,
 '[{"name":"Pipeline Sprint","price":"auf Anfrage","desc":"ICP, Lead-Listen, Sequenzen und Discovery Script fuer die ersten 30 B2B-Gespraeche."},{"name":"Co-Pilot Briefing","price":"inklusive","desc":"Profil, Kontext und offene Fragen werden vor dem Erstgespraech strukturiert."}]'::jsonb,
 '["Passt in die Kategorie growth und ist fuer fruehe Teams vorkuratiert.","Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.","Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
 '[{"from":"matchfoundr","role":"Partner Research","quote":"Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb, true, now()),
('launch-growth-sprint','Launch Growth Sprint','matchfoundr Growth Desk','growth','Berlin','Launch-Plan, Landingpage-Review, Outreach-Sequenzen und erste Kanaltests.',86,'https://www.producthunt.com/ship','https://www.producthunt.com/ship','error',
 '[{"label":"Launch","level":0.96},{"label":"Landingpage","level":0.90},{"label":"Outreach","level":0.84},{"label":"Analytics","level":0.78}]'::jsonb,
 '[{"name":"10 Tage Sprint","price":"auf Anfrage","desc":"Launch-Plan, Landingpage-Review, Outreach-Sequenzen und erste Kanaltests."},{"name":"Co-Pilot Briefing","price":"inklusive","desc":"Profil, Kontext und offene Fragen werden vor dem Erstgespraech strukturiert."}]'::jsonb,
 '["Passt in die Kategorie growth und ist fuer fruehe Teams vorkuratiert.","Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.","Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
 '[{"from":"matchfoundr","role":"Partner Research","quote":"Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb, true, now()),
('gtm-mentor-circle','GTM Mentor Circle','matchfoundr Mentor Network','mentor','Remote','Mentoren fuer Go-to-Market, US-Expansion, ICP-Schaerfung und Enterprise Sales.',87,'https://www.germanaccelerator.com/our-programs','https://www.germanaccelerator.com/our-programs','ok',
 '[{"label":"GTM","level":0.96},{"label":"ICP","level":0.90},{"label":"Enterprise Sales","level":0.84},{"label":"Expansion","level":0.78}]'::jsonb,
 '[{"name":"Mentor Matching","price":"auf Anfrage","desc":"Mentoren fuer Go-to-Market, US-Expansion, ICP-Schaerfung und Enterprise Sales."},{"name":"Co-Pilot Briefing","price":"inklusive","desc":"Profil, Kontext und offene Fragen werden vor dem Erstgespraech strukturiert."}]'::jsonb,
 '["Passt in die Kategorie mentor und ist fuer fruehe Teams vorkuratiert.","Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.","Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
 '[{"from":"matchfoundr","role":"Partner Research","quote":"Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb, true, now()),
('operator-office-hours','Operator Office Hours','matchfoundr Mentor Network','mentor','Remote','Erfahrene Operator fuer Produkt, Sales, Hiring und erste Fuehrungsroutinen.',87,'https://www.startupgrind.com/startups/','https://www.startupgrind.com/startups/','error',
 '[{"label":"Product","level":0.96},{"label":"Sales","level":0.90},{"label":"Hiring","level":0.84},{"label":"Founder Coaching","level":0.78}]'::jsonb,
 '[{"name":"30 Min Office Hour","price":"auf Anfrage","desc":"Erfahrene Operator fuer Produkt, Sales, Hiring und erste Fuehrungsroutinen."},{"name":"Co-Pilot Briefing","price":"inklusive","desc":"Profil, Kontext und offene Fragen werden vor dem Erstgespraech strukturiert."}]'::jsonb,
 '["Passt in die Kategorie mentor und ist fuer fruehe Teams vorkuratiert.","Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.","Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
 '[{"from":"matchfoundr","role":"Partner Research","quote":"Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb, true, now()),
('first-five-hires','First Five Hires','matchfoundr Talent Desk','talent','Deutschland','Pipeline fuer erste Engineer-, Growth- und Ops-Rollen mit Founder-tauglicher Vorauswahl.',85,'https://wellfound.com/recruit','https://wellfound.com/recruit','error',
 '[{"label":"Engineering","level":0.96},{"label":"Growth","level":0.90},{"label":"Ops","level":0.84},{"label":"Founder Fit","level":0.78}]'::jsonb,
 '[{"name":"Shortlist in 10 Tagen","price":"auf Anfrage","desc":"Pipeline fuer erste Engineer-, Growth- und Ops-Rollen mit Founder-tauglicher Vorauswahl."},{"name":"Co-Pilot Briefing","price":"inklusive","desc":"Profil, Kontext und offene Fragen werden vor dem Erstgespraech strukturiert."}]'::jsonb,
 '["Passt in die Kategorie talent und ist fuer fruehe Teams vorkuratiert.","Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.","Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
 '[{"from":"matchfoundr","role":"Partner Research","quote":"Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb, true, now()),
('fractional-talent','Fractional Talent Pool','matchfoundr Talent Desk','talent','Remote','Fractional Spezialisten fuer Design, Data, Finance und Growth bevor Vollzeit-Hiring Sinn ergibt.',78,'https://www.malt.de/','https://www.malt.de/','error',
 '[{"label":"Fractional","level":0.96},{"label":"Design","level":0.90},{"label":"Data","level":0.84},{"label":"Finance","level":0.78}]'::jsonb,
 '[{"name":"ab 1 Tag / Woche","price":"auf Anfrage","desc":"Fractional Spezialisten fuer Design, Data, Finance und Growth bevor Vollzeit-Hiring Sinn ergibt."},{"name":"Co-Pilot Briefing","price":"inklusive","desc":"Profil, Kontext und offene Fragen werden vor dem Erstgespraech strukturiert."}]'::jsonb,
 '["Passt in die Kategorie talent und ist fuer fruehe Teams vorkuratiert.","Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.","Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
 '[{"from":"matchfoundr","role":"Partner Research","quote":"Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb, true, now()),
('startup-tax-readiness','Startup Tax Readiness','matchfoundr Partner Desk','tax','Remote','Setup fuer Buchhaltung, USt, Lohn, DATEV-Export und erste Monatsabschluesse.',88,'https://www.lexware.de/gruenderedition/','https://www.lexoffice.de/gruender/','ok',
 '[{"label":"Buchhaltung","level":0.96},{"label":"USt-Voranmeldung","level":0.90},{"label":"DATEV","level":0.84},{"label":"Lohn","level":0.78}]'::jsonb,
 '[{"name":"ab EUR 390 / Monat","price":"auf Anfrage","desc":"Setup fuer Buchhaltung, USt, Lohn, DATEV-Export und erste Monatsabschluesse."},{"name":"Co-Pilot Briefing","price":"inklusive","desc":"Profil, Kontext und offene Fragen werden vor dem Erstgespraech strukturiert."}]'::jsonb,
 '["Passt in die Kategorie tax und ist fuer fruehe Teams vorkuratiert.","Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.","Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
 '[{"from":"matchfoundr","role":"Partner Research","quote":"Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb, true, now()),
('research-allowance-desk','Forschungszulage Desk','matchfoundr Partner Desk','tax','Deutschland','Prueft FuE-Faehigkeit und strukturiert Nachweise fuer Forschungszulage-Antraege.',84,'https://www.bescheinigung-forschungszulage.de/','https://www.bescheinigung-forschungszulage.de/','ok',
 '[{"label":"Forschungszulage","level":0.96},{"label":"FuE-Dokumentation","level":0.90},{"label":"Kostenplan","level":0.84},{"label":"Antrag","level":0.78}]'::jsonb,
 '[{"name":"Erstcheck kostenlos","price":"Kostenlos","desc":"Prueft FuE-Faehigkeit und strukturiert Nachweise fuer Forschungszulage-Antraege."},{"name":"Co-Pilot Briefing","price":"inklusive","desc":"Profil, Kontext und offene Fragen werden vor dem Erstgespraech strukturiert."}]'::jsonb,
 '["Passt in die Kategorie tax und ist fuer fruehe Teams vorkuratiert.","Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.","Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
 '[{"from":"matchfoundr","role":"Partner Research","quote":"Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb, true, now())
on conflict (slug) do update set
  name = excluded.name, firm = excluded.firm, service_id = excluded.service_id, city = excluded.city,
  blurb = excluded.blurb, fit = excluded.fit, source_url = excluded.source_url, booking_url = excluded.booking_url,
  scrape_status = excluded.scrape_status, specialties = excluded.specialties, packages = excluded.packages,
  why = excluded.why, vouches = excluded.vouches, is_active = excluded.is_active, updated_at = now();