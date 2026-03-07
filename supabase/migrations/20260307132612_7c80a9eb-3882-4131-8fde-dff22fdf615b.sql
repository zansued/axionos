
-- Sprint 19 Expansion: proposal_quality_feedback + proposal_quality_summaries

-- 1. Main feedback table
CREATE TABLE IF NOT EXISTS public.proposal_quality_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  entity_type text NOT NULL DEFAULT 'recommendation',
  entity_id uuid NOT NULL,
  source_meta_agent_type text,
  artifact_type text,
  decision_signal text NOT NULL DEFAULT 'unknown',
  follow_through_signal text NOT NULL DEFAULT 'unknown',
  outcome_signal text NOT NULL DEFAULT 'unknown',
  reviewer_feedback_score numeric,
  quality_score numeric NOT NULL DEFAULT 0,
  usefulness_score numeric NOT NULL DEFAULT 0,
  historical_support_score numeric,
  historical_conflict_score numeric,
  feedback_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pqf_org ON public.proposal_quality_feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_pqf_workspace ON public.proposal_quality_feedback(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pqf_entity ON public.proposal_quality_feedback(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pqf_created ON public.proposal_quality_feedback(created_at);

ALTER TABLE public.proposal_quality_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view proposal feedback"
  ON public.proposal_quality_feedback FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage proposal feedback"
  ON public.proposal_quality_feedback FOR ALL
  TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

-- 2. Proposal quality summaries
CREATE TABLE IF NOT EXISTS public.proposal_quality_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  summary_type text NOT NULL DEFAULT 'agent_quality',
  meta_agent_type text,
  artifact_type text,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  total_feedback_count integer NOT NULL DEFAULT 0,
  avg_quality_score numeric NOT NULL DEFAULT 0,
  avg_usefulness_score numeric NOT NULL DEFAULT 0,
  acceptance_rate numeric NOT NULL DEFAULT 0,
  implementation_rate numeric NOT NULL DEFAULT 0,
  positive_outcome_rate numeric NOT NULL DEFAULT 0,
  top_feedback_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  historically_supported_performance numeric,
  historically_novel_performance numeric,
  rejection_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  advisory_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pqs_org ON public.proposal_quality_summaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_pqs_type ON public.proposal_quality_summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_pqs_period ON public.proposal_quality_summaries(period_start, period_end);

ALTER TABLE public.proposal_quality_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view quality summaries"
  ON public.proposal_quality_summaries FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage quality summaries"
  ON public.proposal_quality_summaries FOR ALL
  TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));
