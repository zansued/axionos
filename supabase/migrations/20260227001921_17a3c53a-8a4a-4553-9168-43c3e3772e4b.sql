-- Add execution tracking to subtasks
ALTER TABLE public.story_subtasks 
  ADD COLUMN output text,
  ADD COLUMN executed_by_agent_id uuid REFERENCES public.agents(id),
  ADD COLUMN executed_at timestamp with time zone;

-- Add execution tracking to stories for agent assignment awareness
-- (assigned_agent_id already exists)