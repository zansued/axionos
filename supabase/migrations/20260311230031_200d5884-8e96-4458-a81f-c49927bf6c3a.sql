
-- Learning Signals table — Sprint 155
CREATE TABLE public.learning_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'action_outcome',
  source_id TEXT,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  stage TEXT DEFAULT '',
  signal_type TEXT NOT NULL DEFAULT 'repeated_failure_pattern',
  severity TEXT NOT NULL DEFAULT 'medium',
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  summary TEXT NOT NULL DEFAULT '',
  explanation TEXT DEFAULT '',
  related_action_id TEXT,
  related_outcome_id TEXT,
  related_canon_entry_ids TEXT[] DEFAULT '{}',
  related_agent_id TEXT,
  related_policy_decision_id TEXT,
  related_recovery_hook_id TEXT,
  routing_target TEXT DEFAULT 'governance_review',
  aggregation_key TEXT,
  aggregation_count INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_signals_org ON public.learning_signals(organization_id);
CREATE INDEX idx_learning_signals_type ON public.learning_signals(organization_id, signal_type);
CREATE INDEX idx_learning_signals_stage ON public.learning_signals(organization_id, stage);
CREATE INDEX idx_learning_signals_routing ON public.learning_signals(organization_id, routing_target);
CREATE INDEX idx_learning_signals_agg ON public.learning_signals(organization_id, aggregation_key);

ALTER TABLE public.learning_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org learning signals"
  ON public.learning_signals FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert org learning signals"
  ON public.learning_signals FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update org learning signals"
  ON public.learning_signals FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
