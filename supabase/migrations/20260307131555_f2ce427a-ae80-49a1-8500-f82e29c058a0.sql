
-- Sprint 19: Proposal Quality Feedback Loop

-- Track quality outcomes for recommendations and artifacts
CREATE TABLE public.proposal_quality_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  entity_type TEXT NOT NULL DEFAULT 'recommendation', -- 'recommendation' or 'artifact'
  entity_id UUID NOT NULL,
  meta_agent_type TEXT NOT NULL DEFAULT '',
  recommendation_type TEXT NOT NULL DEFAULT '',
  artifact_type TEXT,
  
  -- Quality signals from review
  review_outcome TEXT NOT NULL DEFAULT 'pending', -- accepted, rejected, deferred, approved, implemented
  review_latency_hours NUMERIC, -- time from creation to first review
  reviewer_notes_length INTEGER DEFAULT 0,
  
  -- Quality scores (computed)
  acceptance_quality_score NUMERIC NOT NULL DEFAULT 0, -- 0-1: how well this type gets accepted
  implementation_quality_score NUMERIC NOT NULL DEFAULT 0, -- 0-1: how well accepted items get implemented
  historical_alignment_accuracy NUMERIC NOT NULL DEFAULT 0, -- 0-1: did historical alignment predict outcome?
  overall_quality_score NUMERIC NOT NULL DEFAULT 0, -- 0-1: composite score
  
  -- Context at time of review
  confidence_at_creation NUMERIC DEFAULT 0,
  impact_at_creation NUMERIC DEFAULT 0,
  priority_at_creation NUMERIC DEFAULT 0,
  historical_alignment TEXT,
  was_memory_enriched BOOLEAN DEFAULT false,
  
  -- Feedback signals
  feedback_signals JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aggregate quality metrics per meta-agent type
CREATE TABLE public.proposal_quality_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  meta_agent_type TEXT NOT NULL DEFAULT '',
  
  -- Aggregate counts
  total_recommendations INTEGER NOT NULL DEFAULT 0,
  total_accepted INTEGER NOT NULL DEFAULT 0,
  total_rejected INTEGER NOT NULL DEFAULT 0,
  total_deferred INTEGER NOT NULL DEFAULT 0,
  total_artifacts_generated INTEGER NOT NULL DEFAULT 0,
  total_artifacts_approved INTEGER NOT NULL DEFAULT 0,
  total_artifacts_implemented INTEGER NOT NULL DEFAULT 0,
  
  -- Aggregate quality scores
  avg_acceptance_rate NUMERIC NOT NULL DEFAULT 0,
  avg_implementation_rate NUMERIC NOT NULL DEFAULT 0,
  avg_confidence_accepted NUMERIC NOT NULL DEFAULT 0,
  avg_confidence_rejected NUMERIC NOT NULL DEFAULT 0,
  avg_review_latency_hours NUMERIC NOT NULL DEFAULT 0,
  avg_overall_quality NUMERIC NOT NULL DEFAULT 0,
  
  -- Memory effectiveness
  memory_enriched_acceptance_rate NUMERIC NOT NULL DEFAULT 0,
  non_memory_acceptance_rate NUMERIC NOT NULL DEFAULT 0,
  
  -- Trend
  quality_trend TEXT NOT NULL DEFAULT 'stable', -- improving, stable, declining
  
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, meta_agent_type)
);

-- RLS
ALTER TABLE public.proposal_quality_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_quality_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view quality records" ON public.proposal_quality_records
  FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage quality records" ON public.proposal_quality_records
  FOR ALL TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Org members can view quality aggregates" ON public.proposal_quality_aggregates
  FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage quality aggregates" ON public.proposal_quality_aggregates
  FOR ALL TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

-- Index for fast lookups
CREATE INDEX idx_pqr_org_entity ON public.proposal_quality_records(organization_id, entity_type, entity_id);
CREATE INDEX idx_pqa_org_agent ON public.proposal_quality_aggregates(organization_id, meta_agent_type);
