
-- Action Engine Registry table (Sprint 154)
CREATE TABLE public.action_registry_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  trigger_id TEXT NOT NULL DEFAULT '',
  trigger_type TEXT NOT NULL DEFAULT 'unknown',
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  stage TEXT DEFAULT 'intake',
  execution_mode TEXT NOT NULL DEFAULT 'auto',
  status TEXT NOT NULL DEFAULT 'pending',
  risk_level TEXT DEFAULT 'medium',
  description TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  policy_decision_id TEXT,
  dispatch_decision_id TEXT,
  approval_id TEXT,
  approved_by TEXT,
  requires_approval BOOLEAN DEFAULT false,
  rollback_available BOOLEAN DEFAULT false,
  constraints JSONB DEFAULT '[]'::jsonb,
  outcome_status TEXT,
  outcome_summary TEXT,
  outcome_errors JSONB,
  recovery_hook_id TEXT,
  recovery_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_action_registry_entries_org_status ON public.action_registry_entries(organization_id, status);
CREATE INDEX idx_action_registry_entries_initiative ON public.action_registry_entries(initiative_id);
CREATE INDEX idx_action_registry_entries_stage ON public.action_registry_entries(organization_id, stage);

ALTER TABLE public.action_registry_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org action entries"
  ON public.action_registry_entries FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert org action entries"
  ON public.action_registry_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update org action entries"
  ON public.action_registry_entries FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Action audit trail table
CREATE TABLE public.action_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'status_change',
  previous_status TEXT,
  new_status TEXT,
  reason TEXT DEFAULT '',
  actor_type TEXT DEFAULT 'system',
  actor_id TEXT,
  executor_type TEXT,
  execution_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_audit_events_action ON public.action_audit_events(action_id);
CREATE INDEX idx_action_audit_events_org ON public.action_audit_events(organization_id);

ALTER TABLE public.action_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org audit events"
  ON public.action_audit_events FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert org audit events"
  ON public.action_audit_events FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
