
-- founder_skills
CREATE TABLE public.founder_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skills jsonb default '[]'::jsonb,
  categories jsonb default '[]'::jsonb,
  availability integer,
  looking_for jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
ALTER TABLE public.founder_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own skills" ON public.founder_skills
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER founder_skills_updated_at
  BEFORE UPDATE ON public.founder_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- founder_assessment
CREATE TABLE public.founder_assessment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_answers jsonb not null,
  scores jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
ALTER TABLE public.founder_assessment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assessment" ON public.founder_assessment
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER founder_assessment_updated_at
  BEFORE UPDATE ON public.founder_assessment
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- profiles.founder_type
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founder_type text
  CHECK (founder_type IN ('founder', 'talent', 'hybrid'));
