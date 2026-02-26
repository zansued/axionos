
-- Planning sessions to track the PRD → Architecture → Stories pipeline
CREATE TABLE public.planning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'prd_draft',
  prd_content text,
  architecture_content text,
  notes text,
  assigned_analyst_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  assigned_architect_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  assigned_pm_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  assigned_sm_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own planning sessions"
ON public.planning_sessions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_planning_sessions_updated_at
BEFORE UPDATE ON public.planning_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.planning_sessions;
