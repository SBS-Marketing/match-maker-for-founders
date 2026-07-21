-- ═══════════════════════════════════════════════════════════════════════════
-- matchfoundr · Co-Pilot Session-Gedächtnis (Rolling Summary)
-- Der Co-Pilot pflegt pro Session eine fortlaufende, verdichtete Zusammenfassung
-- des ganzen Gesprächs. So kennt er den kompletten Faden, ohne bei jeder
-- Nachricht den vollen (teuren) Verlauf mitzuschicken.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.copilot_sessions
  add column if not exists summary text,
  add column if not exists summary_updated_at timestamptz;
