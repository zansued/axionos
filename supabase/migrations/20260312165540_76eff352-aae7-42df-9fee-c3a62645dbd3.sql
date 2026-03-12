
-- Sprint 185: Renewal-to-Governance Decision Bridge

-- Bridge table tracking the lifecycle of renewal-to-governance transitions
CREATE TABLE public.renewal_governance_bridge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  renewal_proposal_id UUID REFERENCES public.knowledge_renewal_proposals(id),
  renewal_workflow_id UUID REFERENCES public.knowledge_revalidation_workflows(id),
  renewal_trigger_id UUID REFERENCES public.knowledge_renewal_triggers(id),
  target_entry_id TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'canon_entry',
  
  -- Mapping
  renewal_outcome TEXT NOT NULL DEFAULT '',
  governance_action_type TEXT NOT NULL DEFAULT '',
  
  -- Bridge status
  bridge_status TEXT NOT NULL DEFAULT 'bridge_eligible'
    CHECK (bridge_status IN (
      'no_bridge_needed', 'bridge_eligible', 'proposal_created',
      'awaiting_governance_review', 'governance_decided',
      'governance_rejected', 'governance_approved'
    )),
  
  -- Governance proposal reference (once created)
  governance_proposal_id UUID,
  governance_proposal_source TEXT,
  governance_decision TEXT,
  governance_decision_notes TEXT,
  governance_decided_by UUID,
  governance_decided_at TIMESTAMPTZ,
  
  -- Knowledge context
  confidence_before NUMERIC,
  confidence_after NUMERIC,
  urgency TEXT NOT NULL DEFAULT 'medium',
  rationale TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_governance_action TEXT NOT NULL DEFAULT '',
  
  -- Back-propagation tracking
  back_propagation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (back_propagation_status IN ('pending', 'applied', 'skipped', 'failed')),
  back_propagation_result JSONB,
  back_propagated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bridge audit events
CREATE TABLE public.renewal_governance_bridge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  bridge_id UUID NOT NULL REFERENCES public.renewal_governance_bridge(id),
  event_type TEXT NOT NULL DEFAULT 'created',
  actor_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rgb_org ON public.renewal_governance_bridge(organization_id);
CREATE INDEX idx_rgb_status ON public.renewal_governance_bridge(bridge_status);
CREATE INDEX idx_rgb_target ON public.renewal_governance_bridge(target_entry_id);
CREATE INDEX idx_rgb_proposal ON public.renewal_governance_bridge(renewal_proposal_id);
CREATE INDEX idx_rgb_events_bridge ON public.renewal_governance_bridge_events(bridge_id);
CREATE INDEX idx_rgb_events_org ON public.renewal_governance_bridge_events(organization_id);

-- RLS
ALTER TABLE public.renewal_governance_bridge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_governance_bridge_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view bridge records" ON public.renewal_governance_bridge
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can insert bridge records" ON public.renewal_governance_bridge
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can update bridge records" ON public.renewal_governance_bridge
  FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can view bridge events" ON public.renewal_governance_bridge_events
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can insert bridge events" ON public.renewal_governance_bridge_events
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));
