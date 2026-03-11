
CREATE TABLE IF NOT EXISTS public.agent_selection_tuning_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  proposal_type TEXT NOT NULL DEFAULT 'request_selection_review',
  target_selection_scope TEXT NOT NULL DEFAULT 'stage',
  target_agent_id TEXT,
  target_stage_scope TEXT,
  target_action_type_scope TEXT,
  target_capability_scope TEXT,
  related_learning_signal_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_action_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_outcome_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_agent_decision_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
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

ALTER TABLE public.agent_selection_tuning_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on agent_selection_tuning_proposals"
  ON public.agent_selection_tuning_proposals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read on agent_selection_tuning_proposals"
  ON public.agent_selection_tuning_proposals
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_agent_sel_tuning_org ON public.agent_selection_tuning_proposals(organization_id);
CREATE INDEX idx_agent_sel_tuning_status ON public.agent_selection_tuning_proposals(review_status);
CREATE INDEX idx_agent_sel_tuning_type ON public.agent_selection_tuning_proposals(proposal_type);
CREATE INDEX idx_agent_sel_tuning_severity ON public.agent_selection_tuning_proposals(severity);
CREATE INDEX idx_agent_sel_tuning_agent ON public.agent_selection_tuning_proposals(target_agent_id);
