
-- Sprint 190: Knowledge Acquisition ROI & Learning Efficiency Engine

CREATE TABLE public.knowledge_acquisition_roi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  plan_id UUID REFERENCES public.knowledge_acquisition_plans(id),
  job_id UUID REFERENCES public.knowledge_acquisition_jobs(id),
  source_ref TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT '',
  acquisition_mode TEXT NOT NULL DEFAULT 'targeted',
  total_cost NUMERIC NOT NULL DEFAULT 0,
  candidates_generated INTEGER NOT NULL DEFAULT 0,
  canon_promoted INTEGER NOT NULL DEFAULT 0,
  skills_generated INTEGER NOT NULL DEFAULT 0,
  runtime_usage_count INTEGER NOT NULL DEFAULT 0,
  coverage_gap_reduction NUMERIC NOT NULL DEFAULT 0,
  confidence_gain NUMERIC NOT NULL DEFAULT 0,
  noise_ratio NUMERIC NOT NULL DEFAULT 0,
  promotion_yield NUMERIC NOT NULL DEFAULT 0,
  roi_score NUMERIC NOT NULL DEFAULT 0,
  cost_efficiency_score NUMERIC NOT NULL DEFAULT 0,
  downstream_value_score NUMERIC NOT NULL DEFAULT 0,
  runtime_usefulness_score NUMERIC NOT NULL DEFAULT 0,
  expected_vs_actual_value NUMERIC NOT NULL DEFAULT 0,
  low_value_flag BOOLEAN NOT NULL DEFAULT false,
  low_value_reasons JSONB DEFAULT '[]'::jsonb,
  evidence_summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_acquisition_roi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org roi snapshots"
  ON public.knowledge_acquisition_roi_snapshots FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert org roi snapshots"
  ON public.knowledge_acquisition_roi_snapshots FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
