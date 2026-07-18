
-- connected_accounts
CREATE TABLE public.connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  account_label text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connected_accounts TO authenticated;
GRANT ALL ON public.connected_accounts TO service_role;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own connected accounts" ON public.connected_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER connected_accounts_updated
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- daily_reports
CREATE TABLE public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_reports TO authenticated;
GRANT ALL ON public.daily_reports TO service_role;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily reports" ON public.daily_reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER daily_reports_updated
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ai_token_grants
CREATE TABLE public.ai_token_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  token_limit integer NOT NULL DEFAULT 0,
  tokens_used integer NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'monthly',
  note text NOT NULL DEFAULT '',
  resets_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_token_grants TO authenticated;
GRANT ALL ON public.ai_token_grants TO service_role;
ALTER TABLE public.ai_token_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read token grants" ON public.ai_token_grants
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write token grants" ON public.ai_token_grants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER ai_token_grants_updated
  BEFORE UPDATE ON public.ai_token_grants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
