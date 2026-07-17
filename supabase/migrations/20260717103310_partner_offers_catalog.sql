-- matchfoundr · Partner-Katalog für die Entdecken-Sektion
-- Generiert von scripts/build_partner_offers_sql.py aus partners_2026-07-17.json
-- 28 Partner über alle Kategorien: capital, funding, growth, legal, mentor, talent, tax

insert into public.partner_offers (
  slug, name, firm, service_id, city, blurb, fit, source_url, booking_url, scrape_status,
  specialties, packages, why, vouches, is_active, updated_at
) values
(
  'angel-readiness', 'Angel Readiness Sprint', 'matchfoundr Capital Desk',
  'capital', 'Berlin', 'Bereitet Angel-Runde, Onepager, Target List und Intro-Material fuer Pre-Seed vor.',
  86, 'https://www.business-angels.de/', 'https://www.business-angels.de/',
  'ok',
  '[{"label": "Angel-Runde", "level": 0.96}, {"label": "Onepager", "level": 0.9}, {"label": "Target List", "level": 0.84}, {"label": "Intro Prep", "level": 0.78}]'::jsonb,
  '[{"name": "2 Wochen Sprint", "price": "auf Anfrage", "desc": "Bereitet Angel-Runde, Onepager, Target List und Intro-Material fuer Pre-Seed vor."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie capital und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'buergschaftsbank-desk', 'Bürgschaftsbank Desk', 'Verband Deutscher Bürgschaftsbanken',
  'capital', 'Deine Region', 'Wenn Sicherheiten fuer den Bankkredit fehlen: Buergschaftsbanken der Laender springen ein — auch fuer kleine Betriebe.',
  84, 'https://vdb.ermoeglicher.de/de/', 'https://www.vdb-info.de/',
  'ok',
  '[{"label": "Buergschaft", "level": 0.96}, {"label": "Bankkredit", "level": 0.9}, {"label": "Sicherheiten", "level": 0.84}]'::jsonb,
  '[{"name": "Antrag ueber Hausbank", "price": "auf Anfrage", "desc": "Wenn Sicherheiten fuer den Bankkredit fehlen: Buergschaftsbanken der Laender springen ein — auch fuer kleine Betriebe."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie capital und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'landesfoerderbank-check', 'Landesförderbank-Check', 'Förderbanken der Länder',
  'capital', 'Deine Region', 'NRW.BANK, L-Bank, IBB & Co: Gruendungsdarlehen deines Bundeslands — oft guenstiger als die Hausbank.',
  82, 'https://www.foerderdatenbank.de/FDB/DE/Foerderwissen/Foerderorganisationen/Landesfoerderinstitute/landesfoerderinstitute.html', 'https://www.foerderdatenbank.de/',
  'ok',
  '[{"label": "Gruendungsdarlehen", "level": 0.96}, {"label": "Landesbank", "level": 0.9}, {"label": "Zinsvorteil", "level": 0.84}]'::jsonb,
  '[{"name": "Antrag ueber Hausbank", "price": "auf Anfrage", "desc": "NRW.BANK, L-Bank, IBB & Co: Gruendungsdarlehen deines Bundeslands — oft guenstiger als die Hausbank."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie capital und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'kfw-finance-desk', 'KfW & Hausbank Finance Desk', 'matchfoundr Capital Desk',
  'capital', 'Deutschland', 'Strukturiert Finanzierungsbedarf, Hausbank-Unterlagen und Foerderkredit-Optionen.',
  78, 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Gr%C3%BCndung-und-Nachfolge/?redirect=780608', 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Gr%C3%BCnden-Nachfolgen/',
  'ok',
  '[{"label": "KfW", "level": 0.96}, {"label": "Hausbank", "level": 0.9}, {"label": "Liquiditaetsplanung", "level": 0.84}, {"label": "Finanzplan", "level": 0.78}]'::jsonb,
  '[{"name": "Finanzierungscheck", "price": "auf Anfrage", "desc": "Strukturiert Finanzierungsbedarf, Hausbank-Unterlagen und Foerderkredit-Optionen."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie capital und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'gruendungszuschuss-desk', 'Gründungszuschuss Desk', 'Agentur für Arbeit',
  'funding', 'Deutschland', 'Bis zu 15 Monate Zuschuss aus der Arbeitslosigkeit in die Selbststaendigkeit — der Klassiker fuer kleine Gruendungen.',
  88, 'https://www.arbeitsagentur.de/selbstaendigkeit/gruendungszuschuss', 'https://www.arbeitsagentur.de/selbstaendigkeit/gruendungszuschuss',
  'error',
  '[{"label": "Gruendungszuschuss", "level": 0.96}, {"label": "Businessplan", "level": 0.9}, {"label": "Tragfaehigkeit", "level": 0.84}, {"label": "ALG-I", "level": 0.78}]'::jsonb,
  '[{"name": "Kostenlos", "price": "Kostenlos", "desc": "Bis zu 15 Monate Zuschuss aus der Arbeitslosigkeit in die Selbststaendigkeit — der Klassiker fuer kleine Gruendungen."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie funding und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'mikrokreditfonds', 'Mein Mikrokredit', 'Mikrokreditfonds Deutschland',
  'funding', 'Deutschland', 'Kredite bis 25.000 € ohne Hausbank — ueber akkreditierte Mikrofinanzinstitute, auch fuer kleine Vorhaben.',
  86, 'https://www.mein-mikrokredit.de/', 'https://www.mein-mikrokredit.de/',
  'error',
  '[{"label": "Mikrokredit", "level": 0.96}, {"label": "bis 25k", "level": 0.9}, {"label": "ohne Hausbank", "level": 0.84}]'::jsonb,
  '[{"name": "Antrag ueber MFI", "price": "auf Anfrage", "desc": "Kredite bis 25.000 € ohne Hausbank — ueber akkreditierte Mikrofinanzinstitute, auch fuer kleine Vorhaben."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie funding und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'bafa-beratungsfoerderung', 'BAFA-Beratungsförderung', 'BAFA',
  'funding', 'Deutschland', 'Der Staat zahlt bis zu 80% deiner Unternehmensberatung — auch fuer Jungunternehmen in den ersten Jahren.',
  84, 'https://www.bafa.de/DE/Wirtschaft/Beratung_Finanzierung/Unternehmensberatung/unternehmensberatung_node.html', 'https://www.bafa.de/',
  'ok',
  '[{"label": "Beratungszuschuss", "level": 0.96}, {"label": "bis 80%", "level": 0.9}, {"label": "Jungunternehmen", "level": 0.84}]'::jsonb,
  '[{"name": "Zuschussantrag", "price": "auf Anfrage", "desc": "Der Staat zahlt bis zu 80% deiner Unternehmensberatung — auch fuer Jungunternehmen in den ersten Jahren."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie funding und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'foerderdatenbank-bund', 'Förderdatenbank des Bundes', 'BMWK',
  'funding', 'Deutschland', 'Alle Foerderprogramme von Bund, Laendern und EU durchsuchbar — nach Region, Branche und Vorhaben filterbar.',
  82, 'https://www.foerderdatenbank.de/FDB/DE/Home/home.html', 'https://www.foerderdatenbank.de/',
  'ok',
  '[{"label": "Bund", "level": 0.96}, {"label": "Laender", "level": 0.9}, {"label": "EU", "level": 0.84}, {"label": "Suche", "level": 0.78}]'::jsonb,
  '[{"name": "Kostenlos", "price": "Kostenlos", "desc": "Alle Foerderprogramme von Bund, Laendern und EU durchsuchbar — nach Region, Branche und Vorhaben filterbar."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie funding und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'google-unternehmensprofil', 'Lokal gefunden werden', 'Google Unternehmensprofil',
  'growth', 'Deine Region', 'Kostenloses Unternehmensprofil bei Google Maps & Suche — der wichtigste Kanal fuer lokale Kundschaft.',
  90, 'https://consent.google.com/ml?continue=https://www.google.com/intl/de_de/business/&gl=DE&hl=en-US&cm=2&pc=acm&src=1&escs=AZ8E49CA2BMCxzf6N1ZFrxnwfj7J2XFimk2IdixwFWNa4kV5fAeC_0hw1PN3QIDSxjLIX9ILpI6O2GSOiTKJYjGvz-XpngJyqH1p', 'https://www.google.com/intl/de_de/business/',
  'ok',
  '[{"label": "Google Maps", "level": 0.96}, {"label": "Lokale Suche", "level": 0.9}, {"label": "Bewertungen", "level": 0.84}]'::jsonb,
  '[{"name": "Kostenlos", "price": "Kostenlos", "desc": "Kostenloses Unternehmensprofil bei Google Maps & Suche — der wichtigste Kanal fuer lokale Kundschaft."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie growth und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'b2b-sales-motion', 'B2B Sales Motion', 'matchfoundr Growth Desk',
  'growth', 'Remote', 'ICP, Lead-Listen, Sequenzen und Discovery Script fuer die ersten 30 B2B-Gespraeche.',
  86, 'https://www.apollo.io/startups', 'https://www.apollo.io/startups',
  'ok',
  '[{"label": "ICP", "level": 0.96}, {"label": "Outbound", "level": 0.9}, {"label": "Discovery", "level": 0.84}, {"label": "CRM", "level": 0.78}]'::jsonb,
  '[{"name": "Pipeline Sprint", "price": "auf Anfrage", "desc": "ICP, Lead-Listen, Sequenzen und Discovery Script fuer die ersten 30 B2B-Gespraeche."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie growth und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'launch-growth-sprint', 'Launch Growth Sprint', 'matchfoundr Growth Desk',
  'growth', 'Berlin', 'Launch-Plan, Landingpage-Review, Outreach-Sequenzen und erste Kanaltests.',
  86, 'https://www.producthunt.com/ship', 'https://www.producthunt.com/ship',
  'error',
  '[{"label": "Launch", "level": 0.96}, {"label": "Landingpage", "level": 0.9}, {"label": "Outreach", "level": 0.84}, {"label": "Analytics", "level": 0.78}]'::jsonb,
  '[{"name": "10 Tage Sprint", "price": "auf Anfrage", "desc": "Launch-Plan, Landingpage-Review, Outreach-Sequenzen und erste Kanaltests."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie growth und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'zukunftswerkstatt-marketing', 'Online-Marketing lernen', 'Google Zukunftswerkstatt',
  'growth', 'Remote', 'Kostenlose Kurse zu SEO, Social Media und Online-Werbung — fuer Gruender ohne Marketing-Vorwissen.',
  80, 'https://grow.google/intl/de/', 'https://learndigital.withgoogle.com/zukunftswerkstatt',
  'ok',
  '[{"label": "SEO", "level": 0.96}, {"label": "Social Media", "level": 0.9}, {"label": "Ads", "level": 0.84}, {"label": "Kurse", "level": 0.78}]'::jsonb,
  '[{"name": "Kostenlos", "price": "Kostenlos", "desc": "Kostenlose Kurse zu SEO, Social Media und Online-Werbung — fuer Gruender ohne Marketing-Vorwissen."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie growth und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'ihk-recht-erstberatung', 'IHK-Erstberatung Recht', 'IHK',
  'legal', 'Deine Region', 'Kostenlose rechtliche Erstorientierung fuer Mitglieder: Vertraege, AGB, Gewerberecht, Arbeitsrecht.',
  86, 'https://www.ihk.de/', 'https://www.ihk.de/',
  'ok',
  '[{"label": "AGB", "level": 0.96}, {"label": "Gewerberecht", "level": 0.9}, {"label": "Vertraege", "level": 0.84}, {"label": "Arbeitsrecht", "level": 0.78}]'::jsonb,
  '[{"name": "Kostenlos fuer Mitglieder", "price": "Kostenlos", "desc": "Kostenlose rechtliche Erstorientierung fuer Mitglieder: Vertraege, AGB, Gewerberecht, Arbeitsrecht."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie legal und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'anwalt-gruendungsrecht', 'Anwalt für Gründungsrecht finden', 'anwalt.de',
  'legal', 'Deutschland', 'Anwaelte fuer Rechtsform, Gesellschaftervertrag und Haftung — mit Bewertungen und Festpreis-Erstberatung.',
  84, 'https://www.anwalt.de/gesellschaftsrecht', 'https://www.anwalt.de/gesellschaftsrecht',
  'error',
  '[{"label": "Rechtsform", "level": 0.96}, {"label": "Gesellschaftervertrag", "level": 0.9}, {"label": "Haftung", "level": 0.84}, {"label": "Erstberatung", "level": 0.78}]'::jsonb,
  '[{"name": "Erstberatung ab €99", "price": "auf Anfrage", "desc": "Anwaelte fuer Rechtsform, Gesellschaftervertrag und Haftung — mit Bewertungen und Festpreis-Erstberatung."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie legal und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'firma-de-gruendungsservice', 'Gründung digital abwickeln', 'firma.de',
  'legal', 'Remote', 'UG/GmbH/Einzelunternehmen digital gruenden — Notartermin, Handelsregister und Unterlagen aus einer Hand.',
  82, 'https://www.firma.de/', 'https://www.firma.de/',
  'ok',
  '[{"label": "UG-Gruendung", "level": 0.96}, {"label": "GmbH", "level": 0.9}, {"label": "Handelsregister", "level": 0.84}, {"label": "Notar", "level": 0.78}]'::jsonb,
  '[{"name": "Pakete ab €49", "price": "auf Anfrage", "desc": "UG/GmbH/Einzelunternehmen digital gruenden — Notartermin, Handelsregister und Unterlagen aus einer Hand."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie legal und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'existenzgruender-recht', 'Verträge & Rechtsform-Check', 'BMWK existenzgruender.de',
  'legal', 'Deutschland', 'Offizielle Checklisten und Mustervorlagen des Bundeswirtschaftsministeriums zu Rechtsform und Vertraegen.',
  76, 'https://www.existenzgruendungsportal.de/DE/Gruendung-vorbereiten/Rechtsformen/inhalt.html', 'https://www.existenzgruender.de/',
  'error',
  '[{"label": "Rechtsformwahl", "level": 0.96}, {"label": "Mustervertraege", "level": 0.9}, {"label": "Checklisten", "level": 0.84}]'::jsonb,
  '[{"name": "Kostenlos", "price": "Kostenlos", "desc": "Offizielle Checklisten und Mustervorlagen des Bundeswirtschaftsministeriums zu Rechtsform und Vertraegen."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie legal und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'gtm-mentor-circle', 'GTM Mentor Circle', 'matchfoundr Mentor Network',
  'mentor', 'Remote', 'Mentoren fuer Go-to-Market, US-Expansion, ICP-Schaerfung und Enterprise Sales.',
  87, 'https://www.germanaccelerator.com/our-programs', 'https://www.germanaccelerator.com/our-programs',
  'ok',
  '[{"label": "GTM", "level": 0.96}, {"label": "ICP", "level": 0.9}, {"label": "Enterprise Sales", "level": 0.84}, {"label": "Expansion", "level": 0.78}]'::jsonb,
  '[{"name": "Mentor Matching", "price": "auf Anfrage", "desc": "Mentoren fuer Go-to-Market, US-Expansion, ICP-Schaerfung und Enterprise Sales."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie mentor und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'operator-office-hours', 'Operator Office Hours', 'matchfoundr Mentor Network',
  'mentor', 'Remote', 'Erfahrene Operator fuer Produkt, Sales, Hiring und erste Fuehrungsroutinen.',
  87, 'https://www.startupgrind.com/startups/', 'https://www.startupgrind.com/startups/',
  'error',
  '[{"label": "Product", "level": 0.96}, {"label": "Sales", "level": 0.9}, {"label": "Hiring", "level": 0.84}, {"label": "Founder Coaching", "level": 0.78}]'::jsonb,
  '[{"name": "30 Min Office Hour", "price": "auf Anfrage", "desc": "Erfahrene Operator fuer Produkt, Sales, Hiring und erste Fuehrungsroutinen."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie mentor und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'ihk-gruendungsberatung', 'IHK-Gründungsberatung', 'IHK',
  'mentor', 'Deine Region', 'Persoenliche Beratung vor Ort: Businessplan-Feedback, Tragfaehigkeitsbescheinigung und Behoerdenwege.',
  86, 'https://www.ihk.de/themen/gruendung', 'https://www.ihk.de/',
  'error',
  '[{"label": "Businessplan", "level": 0.96}, {"label": "Tragfaehigkeit", "level": 0.9}, {"label": "Behoerden", "level": 0.84}, {"label": "Vor Ort", "level": 0.78}]'::jsonb,
  '[{"name": "Kostenlos", "price": "Kostenlos", "desc": "Persoenliche Beratung vor Ort: Businessplan-Feedback, Tragfaehigkeitsbescheinigung und Behoerdenwege."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie mentor und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'senior-experten-service', 'Senior Experten Service', 'SES Bonn',
  'mentor', 'Deutschland', 'Ruhestaendler mit Jahrzehnten Branchenerfahrung begleiten kleine Betriebe — gegen Aufwandspauschale.',
  82, 'https://ses-bonn.de/home', 'https://www.ses-bonn.de/',
  'ok',
  '[{"label": "Branchenerfahrung", "level": 0.96}, {"label": "Handwerk", "level": 0.9}, {"label": "Handel", "level": 0.84}, {"label": "Pauschale", "level": 0.78}]'::jsonb,
  '[{"name": "Aufwandspauschale", "price": "auf Anfrage", "desc": "Ruhestaendler mit Jahrzehnten Branchenerfahrung begleiten kleine Betriebe — gegen Aufwandspauschale."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie mentor und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'first-five-hires', 'First Five Hires', 'matchfoundr Talent Desk',
  'talent', 'Deutschland', 'Pipeline fuer erste Engineer-, Growth- und Ops-Rollen mit Founder-tauglicher Vorauswahl.',
  85, 'https://wellfound.com/recruit', 'https://wellfound.com/recruit',
  'error',
  '[{"label": "Engineering", "level": 0.96}, {"label": "Growth", "level": 0.9}, {"label": "Ops", "level": 0.84}, {"label": "Founder Fit", "level": 0.78}]'::jsonb,
  '[{"name": "Shortlist in 10 Tagen", "price": "auf Anfrage", "desc": "Pipeline fuer erste Engineer-, Growth- und Ops-Rollen mit Founder-tauglicher Vorauswahl."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie talent und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'junico-freelancer', 'Studentische Freelancer', 'Junico',
  'talent', 'Remote', 'Studierende fuer Design, Social Media, Webentwicklung — bezahlbar fuer kleine Budgets, projektweise buchbar.',
  84, 'https://www.junico.de/', 'https://www.junico.de/',
  'ok',
  '[{"label": "Design", "level": 0.96}, {"label": "Social Media", "level": 0.9}, {"label": "Web", "level": 0.84}, {"label": "Projektbasis", "level": 0.78}]'::jsonb,
  '[{"name": "ab Stundensatz", "price": "auf Anfrage", "desc": "Studierende fuer Design, Social Media, Webentwicklung — bezahlbar fuer kleine Budgets, projektweise buchbar."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie talent und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'ihk-lehrstellenboerse', 'Azubis finden', 'IHK-Lehrstellenbörse',
  'talent', 'Deutschland', 'Ausbildungsplaetze kostenlos ausschreiben — der direkte Weg zu Nachwuchs fuer Handwerk und Betrieb.',
  78, 'https://meine-ausbildung-in-deutschland.de/', 'https://www.ihk-lehrstellenboerse.de/',
  'ok',
  '[{"label": "Ausbildung", "level": 0.96}, {"label": "Nachwuchs", "level": 0.9}, {"label": "Kostenlos", "level": 0.84}]'::jsonb,
  '[{"name": "Kostenlos", "price": "Kostenlos", "desc": "Ausbildungsplaetze kostenlos ausschreiben — der direkte Weg zu Nachwuchs fuer Handwerk und Betrieb."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie talent und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'fractional-talent', 'Fractional Talent Pool', 'matchfoundr Talent Desk',
  'talent', 'Remote', 'Fractional Spezialisten fuer Design, Data, Finance und Growth bevor Vollzeit-Hiring Sinn ergibt.',
  78, 'https://www.malt.de/', 'https://www.malt.de/',
  'error',
  '[{"label": "Fractional", "level": 0.96}, {"label": "Design", "level": 0.9}, {"label": "Data", "level": 0.84}, {"label": "Finance", "level": 0.78}]'::jsonb,
  '[{"name": "ab 1 Tag / Woche", "price": "auf Anfrage", "desc": "Fractional Spezialisten fuer Design, Data, Finance und Growth bevor Vollzeit-Hiring Sinn ergibt."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie talent und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'startup-tax-readiness', 'Startup Tax Readiness', 'matchfoundr Partner Desk',
  'tax', 'Remote', 'Setup fuer Buchhaltung, USt, Lohn, DATEV-Export und erste Monatsabschluesse.',
  88, 'https://www.lexware.de/gruenderedition/', 'https://www.lexoffice.de/gruender/',
  'ok',
  '[{"label": "Buchhaltung", "level": 0.96}, {"label": "USt-Voranmeldung", "level": 0.9}, {"label": "DATEV", "level": 0.84}, {"label": "Lohn", "level": 0.78}]'::jsonb,
  '[{"name": "ab €390 / Monat", "price": "auf Anfrage", "desc": "Setup fuer Buchhaltung, USt, Lohn, DATEV-Export und erste Monatsabschluesse."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie tax und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'research-allowance-desk', 'Forschungszulage Desk', 'matchfoundr Partner Desk',
  'tax', 'Deutschland', 'Prueft FuE-Faehigkeit und strukturiert Nachweise fuer Forschungszulage-Antraege.',
  84, 'https://www.bescheinigung-forschungszulage.de/', 'https://www.bescheinigung-forschungszulage.de/',
  'ok',
  '[{"label": "Forschungszulage", "level": 0.96}, {"label": "FuE-Dokumentation", "level": 0.9}, {"label": "Kostenplan", "level": 0.84}, {"label": "Antrag", "level": 0.78}]'::jsonb,
  '[{"name": "Erstcheck kostenlos", "price": "Kostenlos", "desc": "Prueft FuE-Faehigkeit und strukturiert Nachweise fuer Forschungszulage-Antraege."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie tax und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'steuerberater-suchdienst', 'Steuerberater-Suchdienst', 'Bundessteuerberaterkammer',
  'tax', 'Deine Region', 'Offizielle Suche der Steuerberaterkammer — nach Ort, Branche und Schwerpunkt (z.B. Existenzgruendung) filterbar.',
  82, 'https://steuerberater.bstbk.de/', 'https://steuerberater.bstbk.de/',
  'error',
  '[{"label": "Steuerberater-Suche", "level": 0.96}, {"label": "Existenzgruendung", "level": 0.9}, {"label": "Regional", "level": 0.84}]'::jsonb,
  '[{"name": "Kostenlos", "price": "Kostenlos", "desc": "Offizielle Suche der Steuerberaterkammer — nach Ort, Branche und Schwerpunkt (z.B. Existenzgruendung) filterbar."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie tax und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
),
(
  'sevdesk-gruender', 'Buchhaltung selbst machen', 'sevdesk',
  'tax', 'Remote', 'Rechnungen, Belege und EUeR selbst erledigen, bis sich ein Steuerberater lohnt — mit DATEV-Export.',
  80, 'https://sevdesk.de/', 'https://sevdesk.de/',
  'ok',
  '[{"label": "Rechnungen", "level": 0.96}, {"label": "EUeR", "level": 0.9}, {"label": "Belege", "level": 0.84}, {"label": "DATEV-Export", "level": 0.78}]'::jsonb,
  '[{"name": "ab €8,90 / Monat", "price": "auf Anfrage", "desc": "Rechnungen, Belege und EUeR selbst erledigen, bis sich ein Steuerberater lohnt — mit DATEV-Export."}, {"name": "Co-Pilot Briefing", "price": "inklusive", "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert."}]'::jsonb,
  '["Passt in die Kategorie tax und ist fuer fruehe Teams vorkuratiert.", "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.", "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche."]'::jsonb,
  '[{"from": "matchfoundr", "role": "Partner Research", "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline."}]'::jsonb,
  true, now()
)
on conflict (slug) do update set
  name = excluded.name,
  firm = excluded.firm,
  service_id = excluded.service_id,
  city = excluded.city,
  blurb = excluded.blurb,
  fit = excluded.fit,
  source_url = excluded.source_url,
  booking_url = excluded.booking_url,
  scrape_status = excluded.scrape_status,
  specialties = excluded.specialties,
  packages = excluded.packages,
  why = excluded.why,
  vouches = excluded.vouches,
  is_active = excluded.is_active,
  updated_at = now();
