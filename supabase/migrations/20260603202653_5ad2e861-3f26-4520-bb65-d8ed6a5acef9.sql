
-- profiles: add missing columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_onboarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS venture_term text,
  ADD COLUMN IF NOT EXISTS partner_term text;

-- match_results table
CREATE TABLE IF NOT EXISTS public.match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_id uuid NOT NULL,
  fit_score integer,
  reasons jsonb,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_results TO authenticated;
GRANT ALL ON public.match_results TO service_role;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own match results"
  ON public.match_results FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- daily_tasks table
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_date date NOT NULL,
  task_key text NOT NULL,
  service text,
  title text NOT NULL,
  description text,
  href text,
  label text,
  urgency text NOT NULL DEFAULT 'medium',
  minutes integer,
  status text NOT NULL DEFAULT 'open',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_date, task_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_tasks TO authenticated;
GRANT ALL ON public.daily_tasks TO service_role;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily tasks"
  ON public.daily_tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER daily_tasks_set_updated_at
  BEFORE UPDATE ON public.daily_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  status text NOT NULL DEFAULT 'pending',
  token text UNIQUE,
  confirmed_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.waitlist TO service_role;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
-- no client policies; access is via SECURITY DEFINER RPCs

-- RPC: join_waitlist
CREATE OR REPLACE FUNCTION public.join_waitlist(
  p_email text,
  p_name text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_token text;
BEGIN
  v_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.waitlist (email, name, metadata, token)
  VALUES (lower(trim(p_email)), NULLIF(p_name, ''), COALESCE(p_metadata, '{}'::jsonb), v_token)
  ON CONFLICT (email) DO UPDATE
    SET name = COALESCE(EXCLUDED.name, public.waitlist.name),
        metadata = COALESCE(EXCLUDED.metadata, public.waitlist.metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.join_waitlist(text, text, jsonb) TO anon, authenticated;

-- RPC: confirm_waitlist_entry
CREATE OR REPLACE FUNCTION public.confirm_waitlist_entry(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.waitlist
     SET status = 'confirmed',
         confirmed_at = COALESCE(confirmed_at, now())
   WHERE token = p_token
   RETURNING id INTO v_id;
  RETURN v_id IS NOT NULL;
END $$;
GRANT EXECUTE ON FUNCTION public.confirm_waitlist_entry(text) TO anon, authenticated;
