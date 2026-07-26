-- Realtime für copilot_messages: der Co-Pilot kann so eine zweite Nachricht
-- nachreichen (Hintergrundarbeit), die live im Chat erscheint.
-- RLS ist aktiv und filtert die Realtime-Events pro User.
alter publication supabase_realtime add table public.copilot_messages;
