
-- Sprint 102: Resilience & Continuity Governance

-- continuity_assets
CREATE TABLE public.continuity_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL DEFAULT '',
  asset_name TEXT NOT NULL DEFAULT '',
  asset_type TEXT NOT NULL DEFAULT 'service',
  domain TEXT NOT NULL DEFAULT '',
  criticality_level TEXT NOT NULL DEFAULT 'medium',
  continuity_tier TEXT NOT NULL DEFAULT 'standard',
  owner_ref TEXT NOT NULL DEFAULT '',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_continuity_assets_org ON public.continuity_assets(organization_id);
ALTER TABLE public.continuity_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage continuity_assets" ON public.continuity_assets FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- continuity_dependencies
CREATE TABLE public.continuity_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.continuity_assets(id) ON DELETE CASCADE,
  depends_on_asset_id UUID NOT NULL REFERENCES public.continuity_assets(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT '',
  dependency_strength TEXT NOT NULL DEFAULT 'moderate',
  fallback_exists BOOLEAN NOT NULL DEFAULT false,
  recovery_complexity TEXT NOT NULL DEFAULT 'medium',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_continuity_dependencies_org ON public.continuity_dependencies(organization_id);
ALTER TABLE public.continuity_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage continuity_dependencies" ON public.continuity_dependencies FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- resilience_assessments
CREATE TABLE public.resilience_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL DEFAULT '',
  assessment_scope TEXT NOT NULL DEFAULT '',
  resilience_score NUMERIC NOT NULL DEFAULT 0,
  continuity_score NUMERIC NOT NULL DEFAULT 0,
  fallback_readiness_score NUMERIC NOT NULL DEFAULT 0,
  coordination_fragility_score NUMERIC NOT NULL DEFAULT 0,
  memory_recovery_score NUMERIC NOT NULL DEFAULT 0,
  assessment_summary TEXT NOT NULL DEFAULT '',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resilience_assessments_org ON public.resilience_assessments(organization_id);
ALTER TABLE public.resilience_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage resilience_assessments" ON public.resilience_assessments FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- continuity_plans
CREATE TABLE public.continuity_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  disruption_type TEXT NOT NULL DEFAULT '',
  plan_status TEXT NOT NULL DEFAULT 'draft',
  plan_summary TEXT NOT NULL DEFAULT '',
  activation_criteria TEXT NOT NULL DEFAULT '',
  fallback_sequence JSONB NOT NULL DEFAULT '[]',
  recovery_sequence JSONB NOT NULL DEFAULT '[]',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_continuity_plans_org ON public.continuity_plans(organization_id);
ALTER TABLE public.continuity_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage continuity_plans" ON public.continuity_plans FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- continuity_incidents
CREATE TABLE public.continuity_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_code TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  disruption_type TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  impacted_assets JSONB NOT NULL DEFAULT '[]',
  continuity_plan_id UUID REFERENCES public.continuity_plans(id),
  incident_status TEXT NOT NULL DEFAULT 'open',
  incident_summary TEXT NOT NULL DEFAULT '',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_continuity_incidents_org ON public.continuity_incidents(organization_id);
ALTER TABLE public.continuity_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage continuity_incidents" ON public.continuity_incidents FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
