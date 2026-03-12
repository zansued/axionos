
-- Sprint 183: Knowledge Renewal & Revalidation Engine

-- A. Renewal Triggers
CREATE TABLE public.knowledge_renewal_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  target_entry_id UUID NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'canon_entry',
  trigger_type TEXT NOT NULL DEFAULT 'stale_knowledge',
  reason TEXT NOT NULL DEFAULT '',
  strength NUMERIC NOT NULL DEFAULT 0.5,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_renewal_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view renewal triggers"
  ON public.knowledge_renewal_triggers FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert renewal triggers"
  ON public.knowledge_renewal_triggers FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update renewal triggers"
  ON public.knowledge_renewal_triggers FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- B. Revalidation Workflows
CREATE TABLE public.knowledge_revalidation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  trigger_id UUID REFERENCES public.knowledge_renewal_triggers(id),
  target_entry_id UUID NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'canon_entry',
  renewal_mode TEXT NOT NULL DEFAULT 'light_revalidation',
  status TEXT NOT NULL DEFAULT 'pending',
  outcome TEXT,
  confidence_before NUMERIC,
  confidence_after NUMERIC,
  evidence_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  revalidation_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_revalidation_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view revalidation workflows"
  ON public.knowledge_revalidation_workflows FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert revalidation workflows"
  ON public.knowledge_revalidation_workflows FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update revalidation workflows"
  ON public.knowledge_revalidation_workflows FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- C. Renewal Proposals
CREATE TABLE public.knowledge_renewal_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workflow_id UUID REFERENCES public.knowledge_revalidation_workflows(id),
  target_entry_id UUID NOT NULL,
  proposal_type TEXT NOT NULL DEFAULT 'refresh_source_evidence',
  urgency TEXT NOT NULL DEFAULT 'low',
  recommended_action TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_renewal_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view renewal proposals"
  ON public.knowledge_renewal_proposals FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert renewal proposals"
  ON public.knowledge_renewal_proposals FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update renewal proposals"
  ON public.knowledge_renewal_proposals FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- D. Renewal History / Audit
CREATE TABLE public.knowledge_renewal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  target_entry_id UUID NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'canon_entry',
  event_type TEXT NOT NULL DEFAULT 'renewal_completed',
  renewal_mode TEXT,
  outcome TEXT,
  confidence_before NUMERIC,
  confidence_after NUMERIC,
  explanation TEXT NOT NULL DEFAULT '',
  actor_id TEXT,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_renewal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view renewal history"
  ON public.knowledge_renewal_history FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert renewal history"
  ON public.knowledge_renewal_history FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_renewal_triggers_org ON public.knowledge_renewal_triggers(organization_id);
CREATE INDEX idx_renewal_triggers_target ON public.knowledge_renewal_triggers(target_entry_id);
CREATE INDEX idx_renewal_triggers_status ON public.knowledge_renewal_triggers(status);
CREATE INDEX idx_revalidation_workflows_org ON public.knowledge_revalidation_workflows(organization_id);
CREATE INDEX idx_revalidation_workflows_status ON public.knowledge_revalidation_workflows(status);
CREATE INDEX idx_renewal_proposals_org ON public.knowledge_renewal_proposals(organization_id);
CREATE INDEX idx_renewal_proposals_status ON public.knowledge_renewal_proposals(status);
CREATE INDEX idx_renewal_history_org ON public.knowledge_renewal_history(organization_id);
CREATE INDEX idx_renewal_history_target ON public.knowledge_renewal_history(target_entry_id);
