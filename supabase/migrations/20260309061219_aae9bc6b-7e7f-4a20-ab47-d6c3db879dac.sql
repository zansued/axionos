
-- Sprint 105: Dependency Sovereignty & External Reliance Governance

CREATE TYPE public.dependency_type AS ENUM ('api','model','vendor','platform','infrastructure','operator','integration','service');
CREATE TYPE public.dependency_status AS ENUM ('active','degraded','deprecated','blocked','review_required');
CREATE TYPE public.reliance_type AS ENUM ('critical','primary','secondary','optional','emergency_only');

-- 1) dependency_sovereignty_constitutions
CREATE TABLE public.dependency_sovereignty_constitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_code text NOT NULL DEFAULT '',
  constitution_name text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'organization',
  status public.constitution_status NOT NULL DEFAULT 'draft',
  sovereignty_principles text NOT NULL DEFAULT '',
  risk_thresholds jsonb NOT NULL DEFAULT '{}',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dependency_sovereignty_constitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_dsc" ON public.dependency_sovereignty_constitutions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_dsc" ON public.dependency_sovereignty_constitutions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_upd_dsc" ON public.dependency_sovereignty_constitutions FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 2) external_dependencies
CREATE TABLE public.external_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dependency_code text NOT NULL DEFAULT '',
  dependency_name text NOT NULL DEFAULT '',
  dependency_type public.dependency_type NOT NULL DEFAULT 'service',
  provider_name text NOT NULL DEFAULT '',
  domain text NOT NULL DEFAULT '',
  criticality_level text NOT NULL DEFAULT 'medium',
  replacement_complexity text NOT NULL DEFAULT 'medium',
  lock_in_risk_level text NOT NULL DEFAULT 'low',
  fallback_exists boolean NOT NULL DEFAULT false,
  fallback_summary text NOT NULL DEFAULT '',
  cost_dependency_score numeric NOT NULL DEFAULT 0,
  status public.dependency_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.external_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_ed" ON public.external_dependencies FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_ed" ON public.external_dependencies FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_upd_ed" ON public.external_dependencies FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 3) dependency_reliance_links
CREATE TABLE public.dependency_reliance_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dependency_id uuid NOT NULL REFERENCES public.external_dependencies(id) ON DELETE CASCADE,
  dependent_asset_type text NOT NULL DEFAULT '',
  dependent_asset_ref text NOT NULL DEFAULT '',
  reliance_type public.reliance_type NOT NULL DEFAULT 'secondary',
  blast_radius text NOT NULL DEFAULT 'local',
  autonomy_impact_score numeric NOT NULL DEFAULT 0,
  continuity_impact_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dependency_reliance_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_drl" ON public.dependency_reliance_links FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_drl" ON public.dependency_reliance_links FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 4) dependency_sovereignty_assessments
CREATE TABLE public.dependency_sovereignty_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_id uuid REFERENCES public.dependency_sovereignty_constitutions(id),
  domain text NOT NULL DEFAULT '',
  sovereignty_score numeric NOT NULL DEFAULT 0,
  external_reliance_score numeric NOT NULL DEFAULT 0,
  lock_in_exposure_score numeric NOT NULL DEFAULT 0,
  fallback_readiness_score numeric NOT NULL DEFAULT 0,
  assessment_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dependency_sovereignty_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_dsa" ON public.dependency_sovereignty_assessments FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_dsa" ON public.dependency_sovereignty_assessments FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 5) dependency_disruption_events
CREATE TABLE public.dependency_disruption_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dependency_id uuid REFERENCES public.external_dependencies(id),
  disruption_type text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',
  event_summary text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}',
  continuity_effect text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.dependency_disruption_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_dde" ON public.dependency_disruption_events FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_dde" ON public.dependency_disruption_events FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 6) dependency_exit_paths
CREATE TABLE public.dependency_exit_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dependency_id uuid NOT NULL REFERENCES public.external_dependencies(id) ON DELETE CASCADE,
  exit_type text NOT NULL DEFAULT 'migration',
  substitute_options jsonb NOT NULL DEFAULT '[]',
  migration_steps jsonb NOT NULL DEFAULT '[]',
  feasibility_score numeric NOT NULL DEFAULT 0,
  estimated_switch_cost text NOT NULL DEFAULT '',
  timeline_estimate text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dependency_exit_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_dep" ON public.dependency_exit_paths FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_dep" ON public.dependency_exit_paths FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_upd_dep" ON public.dependency_exit_paths FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_dsc_org ON public.dependency_sovereignty_constitutions(organization_id);
CREATE INDEX idx_ed_org ON public.external_dependencies(organization_id);
CREATE INDEX idx_drl_org ON public.dependency_reliance_links(organization_id);
CREATE INDEX idx_drl_dep ON public.dependency_reliance_links(dependency_id);
CREATE INDEX idx_dsa_org ON public.dependency_sovereignty_assessments(organization_id);
CREATE INDEX idx_dde_org ON public.dependency_disruption_events(organization_id);
CREATE INDEX idx_dep_org ON public.dependency_exit_paths(organization_id);
CREATE INDEX idx_dep_dep ON public.dependency_exit_paths(dependency_id);
