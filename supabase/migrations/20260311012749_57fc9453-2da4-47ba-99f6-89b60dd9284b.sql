
-- Sprint 143: Security Surface Mapping & Threat Domains

-- 1. security_surfaces
CREATE TABLE public.security_surfaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  surface_name TEXT NOT NULL DEFAULT '',
  surface_type TEXT NOT NULL DEFAULT 'generic',
  owning_layer TEXT NOT NULL DEFAULT 'execution',
  related_agent_type TEXT,
  related_contract_type TEXT,
  threat_domain TEXT NOT NULL DEFAULT 'generic',
  exposure_score NUMERIC NOT NULL DEFAULT 0,
  blast_radius_estimate NUMERIC NOT NULL DEFAULT 0,
  tenant_sensitivity NUMERIC NOT NULL DEFAULT 0,
  rollback_sensitivity NUMERIC NOT NULL DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending',
  description TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_surfaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_security_surfaces" ON public.security_surfaces FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 2. security_surface_domains
CREATE TABLE public.security_surface_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  domain_name TEXT NOT NULL DEFAULT '',
  domain_category TEXT NOT NULL DEFAULT 'runtime',
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  surface_count INTEGER NOT NULL DEFAULT 0,
  avg_exposure_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_surface_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_security_surface_domains" ON public.security_surface_domains FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 3. threat_domains
CREATE TABLE public.threat_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  threat_name TEXT NOT NULL DEFAULT '',
  threat_type TEXT NOT NULL DEFAULT 'generic',
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  likelihood_score NUMERIC NOT NULL DEFAULT 0,
  impact_score NUMERIC NOT NULL DEFAULT 0,
  affected_layers TEXT[] NOT NULL DEFAULT '{}',
  affected_agent_types TEXT[] NOT NULL DEFAULT '{}',
  mitigation_posture TEXT NOT NULL DEFAULT 'unmitigated',
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.threat_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_threat_domains" ON public.threat_domains FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 4. exposure_scores
CREATE TABLE public.exposure_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  surface_id UUID REFERENCES public.security_surfaces(id) ON DELETE CASCADE,
  threat_domain_id UUID REFERENCES public.threat_domains(id) ON DELETE SET NULL,
  exposure_type TEXT NOT NULL DEFAULT 'static',
  score NUMERIC NOT NULL DEFAULT 0,
  blast_radius NUMERIC NOT NULL DEFAULT 0,
  tenant_impact NUMERIC NOT NULL DEFAULT 0,
  rollback_impact NUMERIC NOT NULL DEFAULT 0,
  composite_risk NUMERIC NOT NULL DEFAULT 0,
  assessment_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exposure_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_exposure_scores" ON public.exposure_scores FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 5. contract_risk_profiles
CREATE TABLE public.contract_risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  contract_type TEXT NOT NULL DEFAULT '',
  agent_type TEXT NOT NULL DEFAULT '',
  risk_score NUMERIC NOT NULL DEFAULT 0,
  permission_sensitivity NUMERIC NOT NULL DEFAULT 0,
  governance_boundary_score NUMERIC NOT NULL DEFAULT 0,
  tenant_boundary_score NUMERIC NOT NULL DEFAULT 0,
  validation_bypass_risk NUMERIC NOT NULL DEFAULT 0,
  deployment_risk NUMERIC NOT NULL DEFAULT 0,
  threat_domains TEXT[] NOT NULL DEFAULT '{}',
  mitigations JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_risk_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_contract_risk_profiles" ON public.contract_risk_profiles FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 6. tenant_boundary_surfaces
CREATE TABLE public.tenant_boundary_surfaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  boundary_name TEXT NOT NULL DEFAULT '',
  boundary_type TEXT NOT NULL DEFAULT 'rls',
  isolation_strength NUMERIC NOT NULL DEFAULT 0,
  cross_tenant_risk NUMERIC NOT NULL DEFAULT 0,
  rls_coverage NUMERIC NOT NULL DEFAULT 0,
  data_sensitivity TEXT NOT NULL DEFAULT 'standard',
  affected_tables TEXT[] NOT NULL DEFAULT '{}',
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_boundary_surfaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_tenant_boundary_surfaces" ON public.tenant_boundary_surfaces FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 7. runtime_security_boundaries
CREATE TABLE public.runtime_security_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  boundary_name TEXT NOT NULL DEFAULT '',
  boundary_layer TEXT NOT NULL DEFAULT 'execution',
  agent_type TEXT,
  action_type TEXT NOT NULL DEFAULT '',
  risk_level TEXT NOT NULL DEFAULT 'low',
  rollback_available BOOLEAN NOT NULL DEFAULT true,
  governance_gate_required BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_security_boundaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_runtime_security_boundaries" ON public.runtime_security_boundaries FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 8. security_surface_reviews
CREATE TABLE public.security_surface_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  surface_id UUID REFERENCES public.security_surfaces(id) ON DELETE CASCADE,
  reviewer_id UUID,
  review_type TEXT NOT NULL DEFAULT 'initial',
  verdict TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT NOT NULL DEFAULT '',
  risk_assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_surface_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_security_surface_reviews" ON public.security_surface_reviews FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
