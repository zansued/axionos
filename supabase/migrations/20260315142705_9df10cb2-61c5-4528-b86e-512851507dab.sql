
-- NS-04: Decision Layer

-- 1. Decisions table
CREATE TABLE public.nervous_system_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  event_id uuid NOT NULL,
  signal_group_id uuid NULL,
  decision_type text NOT NULL DEFAULT 'observe',
  decision_reason text NOT NULL DEFAULT '',
  decision_confidence numeric NOT NULL DEFAULT 0.5,
  risk_level text NOT NULL DEFAULT 'low',
  priority_level text NOT NULL DEFAULT 'low',
  recommended_action_type text NULL,
  recommended_action_payload jsonb NOT NULL DEFAULT '{}',
  expected_outcome jsonb NOT NULL DEFAULT '{}',
  decision_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  CONSTRAINT valid_decision_type CHECK (decision_type IN (
    'observe', 'surface', 'recommend_action', 'escalate', 'queue_for_action', 'mark_for_learning'
  )),
  CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_priority_level CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_decision_status CHECK (status IN ('active', 'superseded', 'resolved', 'archived')),
  CONSTRAINT valid_decision_confidence CHECK (decision_confidence >= 0 AND decision_confidence <= 1)
);

-- Indexes
CREATE INDEX idx_ns_decisions_org_status ON public.nervous_system_decisions (organization_id, status, created_at DESC);
CREATE INDEX idx_ns_decisions_org_type ON public.nervous_system_decisions (organization_id, decision_type, created_at DESC);
CREATE INDEX idx_ns_decisions_org_priority ON public.nervous_system_decisions (organization_id, priority_level, status);
CREATE UNIQUE INDEX idx_ns_decisions_active_event ON public.nervous_system_decisions (event_id) WHERE status = 'active';

-- RLS
ALTER TABLE public.nervous_system_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ns_decisions_select_org_member"
  ON public.nervous_system_decisions
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 2. Extend events table with decision fields
ALTER TABLE public.nervous_system_events
  ADD COLUMN IF NOT EXISTS decision_id uuid NULL;

-- Index for decision batch processing
CREATE INDEX IF NOT EXISTS idx_ns_events_decision_pending
  ON public.nervous_system_events (organization_id, created_at)
  WHERE status = 'contextualized';
