
CREATE TABLE public.readiness_tuning_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  proposal_type TEXT NOT NULL DEFAULT 'request_readiness_review',
  target_stage_scope TEXT,
  target_readiness_check_id TEXT,
  target_threshold_id TEXT,
  target_rule_scope TEXT NOT NULL DEFAULT 'stage',
  related_learning_signal_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_readiness_result_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_action_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_outcome_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_recovery_hook_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  initiative_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  environment_scope TEXT,
  evidence_summary TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  confidence NUMERIC NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'medium',
  recommendation TEXT NOT NULL DEFAULT '',
  review_status TEXT NOT NULL DEFAULT 'proposed',
  proposed_by_actor_type TEXT NOT NULL DEFAULT 'system_learning_loop',
  aggregation_key TEXT,
  aggregation_count INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.readiness_tuning_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view readiness tuning proposals for their org"
  ON public.readiness_tuning_proposals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can insert readiness tuning proposals"
  ON public.readiness_tuning_proposals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update readiness tuning proposals"
  ON public.readiness_tuning_proposals FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE INDEX idx_readiness_tuning_proposals_org ON public.readiness_tuning_proposals(organization_id);
CREATE INDEX idx_readiness_tuning_proposals_status ON public.readiness_tuning_proposals(review_status);
CREATE INDEX idx_readiness_tuning_proposals_type ON public.readiness_tuning_proposals(proposal_type);
CREATE INDEX idx_readiness_tuning_proposals_severity ON public.readiness_tuning_proposals(severity);
CREATE INDEX idx_readiness_tuning_proposals_stage ON public.readiness_tuning_proposals(target_stage_scope);
