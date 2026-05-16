
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.founder_role AS ENUM ('tech', 'business', 'product', 'design', 'other');
CREATE TYPE public.founder_stage AS ENUM ('idea', 'mvp', 'revenue', 'scaling');
CREATE TYPE public.founder_commitment AS ENUM ('full_time', 'part_time', 'exploring');
CREATE TYPE public.swipe_direction AS ENUM ('like', 'pass');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  photo_url TEXT,
  location TEXT,
  role public.founder_role,
  skills TEXT[] DEFAULT '{}',
  industry TEXT,
  stage public.founder_stage,
  commitment public.founder_commitment,
  vision TEXT,
  looking_for TEXT,
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- swipes
CREATE TABLE public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction public.swipe_direction NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (swiper_id, target_id),
  CHECK (swiper_id <> target_id)
);
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own swipes"
  ON public.swipes FOR SELECT TO authenticated USING (auth.uid() = swiper_id);
CREATE POLICY "Users create own swipes"
  ON public.swipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = swiper_id);

-- matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own matches"
  ON public.matches FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match participants view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.user_a = auth.uid() OR m.user_b = auth.uid())));

CREATE POLICY "Match participants send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.user_a = auth.uid() OR m.user_b = auth.uid()))
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- mutual match trigger
CREATE OR REPLACE FUNCTION public.handle_swipe()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ua UUID; ub UUID;
BEGIN
  IF NEW.direction = 'like' THEN
    IF EXISTS (SELECT 1 FROM public.swipes WHERE swiper_id = NEW.target_id AND target_id = NEW.swiper_id AND direction = 'like') THEN
      ua := LEAST(NEW.swiper_id, NEW.target_id);
      ub := GREATEST(NEW.swiper_id, NEW.target_id);
      INSERT INTO public.matches (user_a, user_b) VALUES (ua, ub) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER on_swipe_created
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_swipe();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
