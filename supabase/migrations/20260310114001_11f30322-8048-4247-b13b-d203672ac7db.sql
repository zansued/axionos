
-- Sprint 125: Tenant-Adaptive Regression Profiles

CREATE TABLE public.tenant_regression_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  profile_type TEXT NOT NULL DEFAULT 'balanced' CHECK (profile_type IN ('conservative', 'balanced', 'aggressive')),
  validation_failure_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.400,
  rollback_rate_threshold INTEGER NOT NULL DEFAULT 2,
  guardrail_breach_threshold INTEGER NOT NULL DEFAULT 0,
  incident_threshold INTEGER NOT NULL DEFAULT 3,
  evidence_trend_threshold NUMERIC(4,3) NOT NULL DEFAULT -0.150,
  autonomy_upgrade_modifier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE public.tenant_regression_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_regression_profiles" ON public.tenant_regression_profiles
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_members_manage_regression_profiles" ON public.tenant_regression_profiles
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_tenant_regression_profiles_org ON public.tenant_regression_profiles(organization_id);
