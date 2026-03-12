
-- Repo Trust Scores: computed trust scores per canon source (repository)
CREATE TABLE public.repo_trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.canon_sources(id) ON DELETE SET NULL,
  source_name TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  
  -- Composite trust score (0.0 - 1.0)
  trust_score NUMERIC NOT NULL DEFAULT 0.5,
  trust_tier TEXT NOT NULL DEFAULT 'medium',
  
  -- Individual trust factors
  trust_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected keys: activity_recency, structural_clarity, architectural_files, 
  -- test_presence, stack_coherence, project_maturity, documentation_quality,
  -- maintenance_signals, pattern_quality, historical_promotion_success
  
  -- Aggregated stats
  patterns_extracted INTEGER NOT NULL DEFAULT 0,
  patterns_promoted INTEGER NOT NULL DEFAULT 0,
  patterns_rejected INTEGER NOT NULL DEFAULT 0,
  promotion_success_rate NUMERIC NOT NULL DEFAULT 0,
  
  -- Evaluation metadata
  last_evaluated_at TIMESTAMPTZ,
  evaluated_by TEXT NOT NULL DEFAULT 'system',
  evaluation_notes TEXT NOT NULL DEFAULT '',
  evaluation_version TEXT NOT NULL DEFAULT 'v1',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.repo_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view repo trust scores for their org"
  ON public.repo_trust_scores FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_repo_trust_scores_org ON public.repo_trust_scores(organization_id);
CREATE INDEX idx_repo_trust_scores_source ON public.repo_trust_scores(source_id);

-- Pattern Weight Factors: computed weights per learning candidate or canon entry
CREATE TABLE public.pattern_weight_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Reference to the pattern (either learning_candidate or canon_entry)
  target_type TEXT NOT NULL DEFAULT 'learning_candidate',
  target_id UUID NOT NULL,
  
  -- Computed weight (0.0 - 1.0)
  pattern_weight NUMERIC NOT NULL DEFAULT 0.5,
  
  -- Weight components
  source_trust NUMERIC NOT NULL DEFAULT 0.5,
  source_support INTEGER NOT NULL DEFAULT 1,
  execution_reinforcement NUMERIC NOT NULL DEFAULT 0,
  recurrence_bonus NUMERIC NOT NULL DEFAULT 0,
  duplication_noise_penalty NUMERIC NOT NULL DEFAULT 0,
  weak_source_penalty NUMERIC NOT NULL DEFAULT 0,
  neural_feedback_bonus NUMERIC NOT NULL DEFAULT 0,
  
  -- Source diversity
  distinct_source_count INTEGER NOT NULL DEFAULT 1,
  trusted_source_count INTEGER NOT NULL DEFAULT 0,
  
  -- Provenance
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  computation_notes TEXT NOT NULL DEFAULT '',
  
  -- Recalibration tracking
  recalibration_count INTEGER NOT NULL DEFAULT 0,
  last_recalibrated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pattern_weight_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pattern weights for their org"
  ON public.pattern_weight_factors FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_pattern_weight_org ON public.pattern_weight_factors(organization_id);
CREATE INDEX idx_pattern_weight_target ON public.pattern_weight_factors(target_type, target_id);

-- Confidence Recalibration Log: tracks changes to confidence scores
CREATE TABLE public.confidence_recalibration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL DEFAULT 'canon_entry',
  target_id UUID NOT NULL,
  previous_confidence NUMERIC NOT NULL DEFAULT 0,
  new_confidence NUMERIC NOT NULL DEFAULT 0,
  recalibration_reason TEXT NOT NULL DEFAULT '',
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  recalibrated_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.confidence_recalibration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recalibration logs for their org"
  ON public.confidence_recalibration_log FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_recalibration_log_org ON public.confidence_recalibration_log(organization_id);
CREATE INDEX idx_recalibration_log_target ON public.confidence_recalibration_log(target_type, target_id);
