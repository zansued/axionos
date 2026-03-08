
-- Sprint 72: Evidence Capture & Improvement Ledger

-- 1. Canonical evidence table
CREATE TABLE public.improvement_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'unknown',
  severity TEXT NOT NULL DEFAULT 'info',
  affected_stage TEXT,
  summary TEXT NOT NULL DEFAULT '',
  detail TEXT,
  structured_metadata JSONB NOT NULL DEFAULT '{}',
  linked_extension_id UUID REFERENCES public.platform_extensions(id) ON DELETE SET NULL,
  linked_activation_id UUID REFERENCES public.extension_activations(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'new',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Context links
CREATE TABLE public.improvement_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES public.improvement_evidence(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'related',
  target_table TEXT NOT NULL DEFAULT '',
  target_id UUID NOT NULL,
  link_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Improvement ledgers (grouping / analysis)
CREATE TABLE public.improvement_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ledger_name TEXT NOT NULL DEFAULT 'Untitled',
  ledger_type TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  high_severity_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Review events (audit trail for evidence reviews)
CREATE TABLE public.improvement_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES public.improvement_evidence(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL DEFAULT 'reviewed',
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  event_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.improvement_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_review_events ENABLE ROW LEVEL SECURITY;

-- RLS policies using existing is_org_member function
CREATE POLICY "org_members_evidence" ON public.improvement_evidence
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_members_evidence_links" ON public.improvement_evidence_links
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_members_ledgers" ON public.improvement_ledgers
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_members_review_events" ON public.improvement_review_events
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Indexes for common queries
CREATE INDEX idx_improvement_evidence_org ON public.improvement_evidence(organization_id);
CREATE INDEX idx_improvement_evidence_source ON public.improvement_evidence(source_type);
CREATE INDEX idx_improvement_evidence_severity ON public.improvement_evidence(severity);
CREATE INDEX idx_improvement_evidence_review ON public.improvement_evidence(review_status);
CREATE INDEX idx_improvement_evidence_links_eid ON public.improvement_evidence_links(evidence_id);
CREATE INDEX idx_improvement_ledgers_org ON public.improvement_ledgers(organization_id);
CREATE INDEX idx_improvement_review_events_eid ON public.improvement_review_events(evidence_id);
