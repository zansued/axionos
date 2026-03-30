
-- Sprint 3: Deploy Assurance — Audit Trail & Rollback Decisions

CREATE TABLE public.deploy_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  initiative_id UUID NOT NULL REFERENCES public.initiatives(id),
  deploy_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  actor_type TEXT NOT NULL DEFAULT 'system',
  cause TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deploy_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_deploy_audit"
  ON public.deploy_audit_events
  FOR ALL
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_deploy_audit_org_deploy ON public.deploy_audit_events(organization_id, deploy_id);
CREATE INDEX idx_deploy_audit_initiative ON public.deploy_audit_events(initiative_id);

CREATE TABLE public.deploy_rollback_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  initiative_id UUID NOT NULL REFERENCES public.initiatives(id),
  deploy_id TEXT NOT NULL,
  action TEXT NOT NULL,
  rollback_target TEXT,
  confidence NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  evidence_summary JSONB DEFAULT '{}',
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  approval_level TEXT NOT NULL DEFAULT 'operator',
  triggered_by TEXT NOT NULL DEFAULT 'system_advisory',
  outcome_status TEXT,
  outcome_notes TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deploy_rollback_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_rollback_decisions"
  ON public.deploy_rollback_decisions
  FOR ALL
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_rollback_decisions_org ON public.deploy_rollback_decisions(organization_id, deploy_id);

CREATE TABLE public.deploy_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  initiative_id UUID NOT NULL REFERENCES public.initiatives(id),
  deploy_id TEXT NOT NULL,
  health_status TEXT NOT NULL DEFAULT 'unknown',
  overall_score INTEGER NOT NULL DEFAULT 0,
  stability_window JSONB DEFAULT '{}',
  probes JSONB DEFAULT '[]',
  regressions JSONB DEFAULT '[]',
  recommendation JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deploy_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_health_checks"
  ON public.deploy_health_checks
  FOR ALL
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_health_checks_org_deploy ON public.deploy_health_checks(organization_id, deploy_id);
