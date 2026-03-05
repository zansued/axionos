
-- Agent Memory: stores learned patterns, decisions, and context from initiatives
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  memory_type TEXT NOT NULL DEFAULT 'lesson_learned',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'initiative',
  relevance_score NUMERIC DEFAULT 0.8,
  times_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_id ON public.agent_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_org_id ON public.agent_memory(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON public.agent_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_scope ON public.agent_memory(scope);

-- Enable RLS
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view agent memory"
  ON public.agent_memory FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can create agent memory"
  ON public.agent_memory FOR INSERT
  WITH CHECK (
    public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
  );

CREATE POLICY "Editors+ can update agent memory"
  ON public.agent_memory FOR UPDATE
  USING (
    public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
  );

CREATE POLICY "Admins can delete agent memory"
  ON public.agent_memory FOR DELETE
  USING (
    public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Org-level ADR knowledge base table
CREATE TABLE IF NOT EXISTS public.org_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL DEFAULT 'architectural_decision',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  source_output_id UUID REFERENCES public.agent_outputs(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_kb_org_id ON public.org_knowledge_base(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_kb_category ON public.org_knowledge_base(category);

ALTER TABLE public.org_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view knowledge base"
  ON public.org_knowledge_base FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage knowledge base"
  ON public.org_knowledge_base FOR ALL
  USING (
    public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
  )
  WITH CHECK (
    public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
  );
