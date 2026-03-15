-- ═══════════════════════════════════════════════════
-- NS-05: Surfacing Layer
-- ═══════════════════════════════════════════════════

-- 1. Create nervous_system_surfaced_items table
CREATE TABLE IF NOT EXISTS public.nervous_system_surfaced_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  decision_id uuid NOT NULL,
  signal_group_id uuid NULL,
  surface_type text NOT NULL,
  surface_status text NOT NULL DEFAULT 'active',
  priority_level text NOT NULL,
  risk_level text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  recommended_action_type text NULL,
  recommended_action_payload jsonb NOT NULL DEFAULT '{}',
  expected_outcome jsonb NOT NULL DEFAULT '{}',
  attention_level text NOT NULL,
  operator_notes jsonb NOT NULL DEFAULT '{}',
  acknowledged_by text NULL,
  acknowledged_at timestamptz NULL,
  approved_by text NULL,
  approved_at timestamptz NULL,
  dismissed_by text NULL,
  dismissed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  surfaced_at timestamptz NOT NULL DEFAULT now(),
  status_reason text NULL,
  surface_metadata jsonb NOT NULL DEFAULT '{}'
);

-- 2. Indexes
CREATE INDEX idx_ns_surfaced_org_status_at ON public.nervous_system_surfaced_items (organization_id, surface_status, surfaced_at DESC);
CREATE INDEX idx_ns_surfaced_org_priority_risk ON public.nervous_system_surfaced_items (organization_id, priority_level, risk_level, surface_status);
CREATE UNIQUE INDEX idx_ns_surfaced_decision_unique ON public.nervous_system_surfaced_items (decision_id);
CREATE INDEX idx_ns_surfaced_event ON public.nervous_system_surfaced_items (event_id);
CREATE INDEX idx_ns_surfaced_signal_group ON public.nervous_system_surfaced_items (signal_group_id);

-- 3. RLS
ALTER TABLE public.nervous_system_surfaced_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ns_surfaced_select_org_member"
  ON public.nervous_system_surfaced_items FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ns_surfaced_insert_service"
  ON public.nervous_system_surfaced_items FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "ns_surfaced_update_service"
  ON public.nervous_system_surfaced_items FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Extend nervous_system_decisions with surfaced_item_id
ALTER TABLE public.nervous_system_decisions ADD COLUMN IF NOT EXISTS surfaced_item_id uuid NULL;

-- 5. Index for decided events pending surfacing
CREATE INDEX IF NOT EXISTS idx_ns_events_decided_pending ON public.nervous_system_events (organization_id, created_at ASC) WHERE status = 'decided';