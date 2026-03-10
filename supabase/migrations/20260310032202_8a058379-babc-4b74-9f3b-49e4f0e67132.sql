
-- Sprint 116: Implementation Pattern Library & Retrieval Layer

-- canon_pattern_embeddings
CREATE TABLE public.canon_pattern_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  canon_entry_id UUID NOT NULL,
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding_vector TEXT,
  language_tags TEXT[] DEFAULT '{}',
  framework_tags TEXT[] DEFAULT '{}',
  stack_tags TEXT[] DEFAULT '{}',
  architecture_scope TEXT NOT NULL DEFAULT 'general',
  problem_type TEXT NOT NULL DEFAULT 'general',
  quality_level TEXT NOT NULL DEFAULT 'standard',
  compatibility_flags JSONB NOT NULL DEFAULT '{}',
  applicability_conditions JSONB NOT NULL DEFAULT '{}',
  anti_pattern_links UUID[] DEFAULT '{}',
  usage_constraints JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_pattern_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view canon_pattern_embeddings" ON public.canon_pattern_embeddings FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can insert canon_pattern_embeddings" ON public.canon_pattern_embeddings FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can update canon_pattern_embeddings" ON public.canon_pattern_embeddings FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_canon_pattern_embeddings_org ON public.canon_pattern_embeddings(organization_id);
CREATE INDEX idx_canon_pattern_embeddings_entry ON public.canon_pattern_embeddings(canon_entry_id);

-- canon_retrieval_profiles
CREATE TABLE public.canon_retrieval_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL DEFAULT 'default',
  retrieval_scope TEXT NOT NULL DEFAULT 'approved_only',
  max_results INT NOT NULL DEFAULT 5,
  min_confidence NUMERIC NOT NULL DEFAULT 0.5,
  preferred_stack_tags TEXT[] DEFAULT '{}',
  preferred_language_tags TEXT[] DEFAULT '{}',
  excluded_lifecycle_statuses TEXT[] DEFAULT ARRAY['deprecated', 'archived'],
  include_experimental BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_retrieval_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage canon_retrieval_profiles" ON public.canon_retrieval_profiles FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_canon_retrieval_profiles_org ON public.canon_retrieval_profiles(organization_id);

-- canon_usage_events
CREATE TABLE public.canon_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  canon_entry_id UUID NOT NULL,
  usage_context TEXT NOT NULL DEFAULT 'unknown',
  pipeline_stage TEXT,
  initiative_id UUID,
  agent_type TEXT,
  retrieval_score NUMERIC NOT NULL DEFAULT 0,
  was_applied BOOLEAN NOT NULL DEFAULT false,
  feedback_signal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage canon_usage_events" ON public.canon_usage_events FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_canon_usage_events_org ON public.canon_usage_events(organization_id);
CREATE INDEX idx_canon_usage_events_entry ON public.canon_usage_events(canon_entry_id);

-- canon_pattern_applications
CREATE TABLE public.canon_pattern_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  canon_entry_id UUID NOT NULL,
  application_context JSONB NOT NULL DEFAULT '{}',
  outcome_status TEXT NOT NULL DEFAULT 'pending',
  outcome_notes TEXT,
  quality_impact_score NUMERIC,
  cost_impact_score NUMERIC,
  applied_by TEXT NOT NULL DEFAULT 'system',
  pipeline_stage TEXT,
  initiative_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_pattern_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage canon_pattern_applications" ON public.canon_pattern_applications FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_canon_pattern_applications_org ON public.canon_pattern_applications(organization_id);

-- canon_retrieval_feedback
CREATE TABLE public.canon_retrieval_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  canon_entry_id UUID NOT NULL,
  usage_event_id UUID REFERENCES public.canon_usage_events(id),
  feedback_type TEXT NOT NULL DEFAULT 'neutral',
  feedback_reason TEXT,
  reviewer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_retrieval_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage canon_retrieval_feedback" ON public.canon_retrieval_feedback FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_canon_retrieval_feedback_org ON public.canon_retrieval_feedback(organization_id);

-- canon_context_bindings
CREATE TABLE public.canon_context_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  canon_entry_id UUID NOT NULL,
  binding_type TEXT NOT NULL DEFAULT 'stage',
  binding_target TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  auto_inject BOOLEAN NOT NULL DEFAULT false,
  conditions JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_context_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage canon_context_bindings" ON public.canon_context_bindings FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_canon_context_bindings_org ON public.canon_context_bindings(organization_id);
CREATE INDEX idx_canon_context_bindings_entry ON public.canon_context_bindings(canon_entry_id);
