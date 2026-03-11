
CREATE TABLE public.policy_tuning_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  proposal_type TEXT NOT NULL DEFAULT 'request_policy_review',
  target_policy_scope TEXT NOT NULL DEFAULT 'global',
  target_policy_object_id TEXT,
  related_learning_signal_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_action_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_outcome_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_policy_decision_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_approval_request_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  initiative_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  stage_scope TEXT NOT NULL DEFAULT 'unknown',
  evidence_summary TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  confidence NUMERIC NOT NULL DEFAULT 0.5,
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

ALTER TABLE public.policy_tuning_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_tuning_proposals_org_read" ON public.policy_tuning_proposals
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "policy_tuning_proposals_org_insert" ON public.policy_tuning_proposals
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "policy_tuning_proposals_org_update" ON public.policy_tuning_proposals
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_policy_tuning_proposals_org ON public.policy_tuning_proposals(organization_id);
CREATE INDEX idx_policy_tuning_proposals_status ON public.policy_tuning_proposals(review_status);
CREATE INDEX idx_policy_tuning_proposals_type ON public.policy_tuning_proposals(proposal_type);
CREATE INDEX idx_policy_tuning_proposals_severity ON public.policy_tuning_proposals(severity);
CREATE INDEX idx_policy_tuning_proposals_agg_key ON public.policy_tuning_proposals(aggregation_key);
