CREATE TABLE IF NOT EXISTS public.potential_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  report jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.potential_analyses TO authenticated;
GRANT ALL ON public.potential_analyses TO service_role;

ALTER TABLE public.potential_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage potential analyses" ON public.potential_analyses;
CREATE POLICY "admins manage potential analyses" ON public.potential_analyses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.submit_potential_analysis(
  p_email text,
  p_name text DEFAULT NULL,
  p_answers jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text := lower(trim(p_email));
BEGIN
  IF v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' OR length(v_email) > 255 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  INSERT INTO public.potential_analyses (email, name, answers)
  VALUES (v_email, nullif(left(coalesce(p_name,''), 120), ''), coalesce(p_answers, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_potential_analysis(text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_potential_analysis(text, text, jsonb) TO anon, authenticated;