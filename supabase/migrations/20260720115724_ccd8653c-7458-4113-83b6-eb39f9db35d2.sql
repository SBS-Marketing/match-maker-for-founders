
ALTER TABLE public.community_events
  ADD COLUMN IF NOT EXISTS recurrence_group_id text,
  ADD COLUMN IF NOT EXISTS recurrence_rule text;

CREATE INDEX IF NOT EXISTS community_events_recurrence_group_idx
  ON public.community_events (recurrence_group_id);
