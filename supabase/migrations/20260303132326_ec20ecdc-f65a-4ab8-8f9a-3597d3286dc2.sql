
-- Create agent_messages table for Chain-of-Agents collaboration tracking
CREATE TABLE public.agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  story_id uuid REFERENCES public.stories(id) ON DELETE SET NULL,
  subtask_id uuid REFERENCES public.story_subtasks(id) ON DELETE SET NULL,
  from_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  to_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'execution',
  role_from text NOT NULL,
  role_to text NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'handoff',
  iteration integer NOT NULL DEFAULT 1,
  tokens_used integer DEFAULT 0,
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_agent_messages_initiative ON public.agent_messages(initiative_id);
CREATE INDEX idx_agent_messages_story ON public.agent_messages(story_id);
CREATE INDEX idx_agent_messages_created ON public.agent_messages(created_at);

-- Enable RLS
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS: org members can view messages via initiative
CREATE POLICY "Org members can view agent messages"
ON public.agent_messages
FOR SELECT
USING (initiative_id IN (
  SELECT id FROM public.initiatives WHERE is_org_member(auth.uid(), organization_id)
));

-- RLS: editors+ can insert messages
CREATE POLICY "Editors+ can create agent messages"
ON public.agent_messages
FOR INSERT
WITH CHECK (initiative_id IN (
  SELECT id FROM public.initiatives
  WHERE get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role])
));

-- RLS: editors+ can update messages  
CREATE POLICY "Editors+ can update agent messages"
ON public.agent_messages
FOR UPDATE
USING (initiative_id IN (
  SELECT id FROM public.initiatives
  WHERE get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role])
));
