
-- Sprint 106: Strategic Succession & Long-Horizon Continuity

-- 1) succession_constitutions
CREATE TABLE public.succession_constitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_code text NOT NULL DEFAULT '',
  constitution_name text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'organization',
  status public.constitution_status NOT NULL DEFAULT 'draft',
  succession_principles text NOT NULL DEFAULT '',
  continuity_thresholds jsonb NOT NULL DEFAULT '{}',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.succession_constitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_sc" ON public.succession_constitutions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_sc" ON public.succession_constitutions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_upd_sc" ON public.succession_constitutions FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 2) critical_roles
CREATE TABLE public.critical_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_code text NOT NULL DEFAULT '',
  role_name text NOT NULL DEFAULT '',
  domain text NOT NULL DEFAULT '',
  role_type text NOT NULL DEFAULT 'operator',
  criticality_level text NOT NULL DEFAULT 'medium',
  continuity_tier text NOT NULL DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.critical_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_cr" ON public.critical_roles FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_cr" ON public.critical_roles FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_upd_cr" ON public.critical_roles FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 3) role_continuity_profiles
CREATE TABLE public.role_continuity_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.critical_roles(id) ON DELETE CASCADE,
  current_owner_type text NOT NULL DEFAULT '',
  current_owner_ref text NOT NULL DEFAULT '',
  backup_exists boolean NOT NULL DEFAULT false,
  backup_ref text NOT NULL DEFAULT '',
  succession_readiness_level text NOT NULL DEFAULT 'low',
  knowledge_concentration_score numeric NOT NULL DEFAULT 0,
  handoff_maturity_score numeric NOT NULL DEFAULT 0,
  continuity_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.role_continuity_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_rcp" ON public.role_continuity_profiles FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_rcp" ON public.role_continuity_profiles FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_upd_rcp" ON public.role_continuity_profiles FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 4) succession_plans
CREATE TABLE public.succession_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.critical_roles(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT '',
  succession_type text NOT NULL DEFAULT 'planned',
  trigger_conditions text NOT NULL DEFAULT '',
  handoff_sequence jsonb NOT NULL DEFAULT '[]',
  knowledge_transfer_steps jsonb NOT NULL DEFAULT '[]',
  authority_transfer_steps jsonb NOT NULL DEFAULT '[]',
  continuity_checks jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.succession_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_sp" ON public.succession_plans FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_sp" ON public.succession_plans FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_upd_sp" ON public.succession_plans FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 5) succession_assessments
CREATE TABLE public.succession_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_id uuid REFERENCES public.succession_constitutions(id),
  domain text NOT NULL DEFAULT '',
  readiness_score numeric NOT NULL DEFAULT 0,
  concentration_risk_score numeric NOT NULL DEFAULT 0,
  handoff_viability_score numeric NOT NULL DEFAULT 0,
  strategy_continuity_score numeric NOT NULL DEFAULT 0,
  assessment_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.succession_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_sa" ON public.succession_assessments FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_sa" ON public.succession_assessments FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 6) continuity_transition_events
CREATE TABLE public.continuity_transition_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.critical_roles(id),
  event_type text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',
  transition_summary text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}',
  continuity_impact text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.continuity_transition_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_cte" ON public.continuity_transition_events FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_ins_cte" ON public.continuity_transition_events FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_sc_org ON public.succession_constitutions(organization_id);
CREATE INDEX idx_cr_org ON public.critical_roles(organization_id);
CREATE INDEX idx_rcp_org ON public.role_continuity_profiles(organization_id);
CREATE INDEX idx_rcp_role ON public.role_continuity_profiles(role_id);
CREATE INDEX idx_sp_org ON public.succession_plans(organization_id);
CREATE INDEX idx_sp_role ON public.succession_plans(role_id);
CREATE INDEX idx_sa_org ON public.succession_assessments(organization_id);
CREATE INDEX idx_cte_org ON public.continuity_transition_events(organization_id);
