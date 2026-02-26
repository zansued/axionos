-- Fix foreign keys to SET NULL on delete for planning_sessions
ALTER TABLE public.planning_sessions
  DROP CONSTRAINT IF EXISTS planning_sessions_assigned_analyst_id_fkey,
  DROP CONSTRAINT IF EXISTS planning_sessions_assigned_architect_id_fkey,
  DROP CONSTRAINT IF EXISTS planning_sessions_assigned_pm_id_fkey,
  DROP CONSTRAINT IF EXISTS planning_sessions_assigned_sm_id_fkey;

ALTER TABLE public.planning_sessions
  ADD CONSTRAINT planning_sessions_assigned_analyst_id_fkey
    FOREIGN KEY (assigned_analyst_id) REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD CONSTRAINT planning_sessions_assigned_architect_id_fkey
    FOREIGN KEY (assigned_architect_id) REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD CONSTRAINT planning_sessions_assigned_pm_id_fkey
    FOREIGN KEY (assigned_pm_id) REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD CONSTRAINT planning_sessions_assigned_sm_id_fkey
    FOREIGN KEY (assigned_sm_id) REFERENCES public.agents(id) ON DELETE SET NULL;

-- Fix foreign key for stories
ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_assigned_agent_id_fkey;

ALTER TABLE public.stories
  ADD CONSTRAINT stories_assigned_agent_id_fkey
    FOREIGN KEY (assigned_agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;