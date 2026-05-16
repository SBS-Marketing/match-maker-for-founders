CREATE TYPE public.profile_path AS ENUM ('founder', 'joiner');
ALTER TABLE public.profiles ADD COLUMN path public.profile_path;