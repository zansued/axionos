
-- Enums
CREATE TYPE public.agent_role AS ENUM ('devops', 'qa', 'architect', 'sm', 'po', 'dev');
CREATE TYPE public.agent_status AS ENUM ('active', 'inactive');
CREATE TYPE public.story_status AS ENUM ('todo', 'in_progress', 'done', 'blocked');
CREATE TYPE public.story_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.phase_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE public.subtask_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Agents table
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role agent_role NOT NULL DEFAULT 'dev',
  description TEXT,
  status agent_status NOT NULL DEFAULT 'active',
  exclusive_authorities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agents" ON public.agents FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Stories table
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status story_status NOT NULL DEFAULT 'todo',
  priority story_priority NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stories" ON public.stories FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Story phases
CREATE TABLE public.story_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status phase_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.story_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own story phases" ON public.story_phases FOR ALL
  USING (story_id IN (SELECT id FROM public.stories WHERE user_id = auth.uid()))
  WITH CHECK (story_id IN (SELECT id FROM public.stories WHERE user_id = auth.uid()));

-- Story subtasks
CREATE TABLE public.story_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES public.story_phases(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status subtask_status NOT NULL DEFAULT 'pending',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.story_subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subtasks" ON public.story_subtasks FOR ALL
  USING (phase_id IN (SELECT id FROM public.story_phases WHERE story_id IN (SELECT id FROM public.stories WHERE user_id = auth.uid())))
  WITH CHECK (phase_id IN (SELECT id FROM public.story_phases WHERE story_id IN (SELECT id FROM public.stories WHERE user_id = auth.uid())));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
