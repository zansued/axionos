
-- Sprint 74: Sandbox Benchmarking & Promotion Governance

-- Benchmark runs tied to improvement candidates
CREATE TABLE public.improvement_benchmark_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  candidate_id UUID NOT NULL REFERENCES public.improvement_candidates(id) ON DELETE CASCADE,
  benchmark_type TEXT NOT NULL DEFAULT 'sandbox_comparison',
  baseline_reference JSONB NOT NULL DEFAULT '{}',
  sandbox_scope TEXT NOT NULL DEFAULT 'bounded',
  status TEXT NOT NULL DEFAULT 'queued',
  benchmark_config JSONB NOT NULL DEFAULT '{}',
  result_metrics JSONB NOT NULL DEFAULT '{}',
  gain_indicators JSONB NOT NULL DEFAULT '{}',
  regression_indicators JSONB NOT NULL DEFAULT '{}',
  risk_posture TEXT NOT NULL DEFAULT 'unknown',
  stability_signal TEXT NOT NULL DEFAULT 'pending',
  recommendation_summary TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.improvement_benchmark_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org benchmark runs"
  ON public.improvement_benchmark_runs FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own org benchmark runs"
  ON public.improvement_benchmark_runs FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own org benchmark runs"
  ON public.improvement_benchmark_runs FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Benchmark metrics detail
CREATE TABLE public.improvement_benchmark_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  benchmark_run_id UUID NOT NULL REFERENCES public.improvement_benchmark_runs(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_label TEXT NOT NULL DEFAULT '',
  baseline_value NUMERIC,
  candidate_value NUMERIC,
  delta NUMERIC,
  delta_pct NUMERIC,
  direction TEXT NOT NULL DEFAULT 'neutral',
  significance TEXT NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.improvement_benchmark_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org benchmark metrics"
  ON public.improvement_benchmark_metrics FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own org benchmark metrics"
  ON public.improvement_benchmark_metrics FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Promotion reviews
CREATE TABLE public.improvement_promotion_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  benchmark_run_id UUID NOT NULL REFERENCES public.improvement_benchmark_runs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.improvement_candidates(id) ON DELETE CASCADE,
  reviewer_id UUID,
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT NOT NULL DEFAULT '',
  risk_assessment TEXT NOT NULL DEFAULT 'unknown',
  recommendation TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.improvement_promotion_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org promotion reviews"
  ON public.improvement_promotion_reviews FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own org promotion reviews"
  ON public.improvement_promotion_reviews FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own org promotion reviews"
  ON public.improvement_promotion_reviews FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Promotion decisions (final outcome)
CREATE TABLE public.improvement_promotion_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.improvement_candidates(id) ON DELETE CASCADE,
  benchmark_run_id UUID REFERENCES public.improvement_benchmark_runs(id) ON DELETE SET NULL,
  review_id UUID REFERENCES public.improvement_promotion_reviews(id) ON DELETE SET NULL,
  decision TEXT NOT NULL DEFAULT 'pending',
  decision_reason TEXT NOT NULL DEFAULT '',
  decided_by UUID,
  rollback_posture TEXT NOT NULL DEFAULT 'available',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.improvement_promotion_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org promotion decisions"
  ON public.improvement_promotion_decisions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own org promotion decisions"
  ON public.improvement_promotion_decisions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
