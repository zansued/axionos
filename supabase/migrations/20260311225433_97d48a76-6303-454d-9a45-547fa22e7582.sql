
-- Action Engine Approval Queue (Sprint 153)
CREATE TABLE public.action_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'unknown',
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  stage TEXT DEFAULT 'intake',
  reason TEXT NOT NULL DEFAULT '',
  explanation TEXT DEFAULT '',
  risk_level TEXT NOT NULL DEFAULT 'medium',
  execution_mode TEXT NOT NULL DEFAULT 'approval_required',
  approval_scope TEXT DEFAULT 'action_execution',
  policy_rules JSONB DEFAULT '[]'::jsonb,
  constraints_summary JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'waiting_approval',
  requested_by TEXT DEFAULT 'system',
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_notes TEXT,
  decided_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast queue queries
CREATE INDEX idx_action_approval_requests_org_status ON public.action_approval_requests(organization_id, status);
CREATE INDEX idx_action_approval_requests_initiative ON public.action_approval_requests(initiative_id);

-- RLS
ALTER TABLE public.action_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org approval requests"
  ON public.action_approval_requests FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update org approval requests"
  ON public.action_approval_requests FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert org approval requests"
  ON public.action_approval_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
