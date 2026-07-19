
ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS latency_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS fallback boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ai_usage_status_idx ON public.ai_usage(status);
CREATE INDEX IF NOT EXISTS ai_usage_model_idx ON public.ai_usage(model);
