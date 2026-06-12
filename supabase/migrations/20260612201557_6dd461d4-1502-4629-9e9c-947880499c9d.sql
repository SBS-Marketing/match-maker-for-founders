-- company_profiles
CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  composition JSONB NOT NULL DEFAULT '{}'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_profiles TO authenticated;
GRANT ALL ON public.company_profiles TO service_role;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published profiles"
  ON public.company_profiles FOR SELECT
  USING (published = true);
CREATE POLICY "Owners can view own profile"
  ON public.company_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owners can insert own profile"
  ON public.company_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update own profile"
  ON public.company_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete own profile"
  ON public.company_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE TRIGGER set_company_profiles_updated_at
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- activity_events
CREATE TABLE public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view activity feed"
  ON public.activity_events FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Users insert own events"
  ON public.activity_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own events"
  ON public.activity_events FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX activity_events_created_at_idx ON public.activity_events (created_at DESC);