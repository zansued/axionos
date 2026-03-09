
-- Sprint 110: Civilizational Continuity Simulation Layer

-- 1. continuity_simulation_constitutions
CREATE TABLE public.continuity_simulation_constitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_code text NOT NULL DEFAULT '',
  constitution_name text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'organization',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','superseded','deprecated')),
  simulation_principles text NOT NULL DEFAULT '',
  default_horizon_settings jsonb NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.continuity_simulation_constitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_continuity_constitutions" ON public.continuity_simulation_constitutions FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_continuity_constitutions" ON public.continuity_simulation_constitutions FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_continuity_constitutions" ON public.continuity_simulation_constitutions FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_continuity_constitutions_org ON public.continuity_simulation_constitutions(organization_id);

-- 2. simulation_scenarios
CREATE TABLE public.simulation_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario_code text NOT NULL DEFAULT '',
  scenario_name text NOT NULL DEFAULT '',
  scenario_type text NOT NULL DEFAULT 'technological_disruption',
  scenario_scope text NOT NULL DEFAULT 'institution',
  scenario_summary text NOT NULL DEFAULT '',
  stress_factors jsonb NOT NULL DEFAULT '[]',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_sim_scenarios" ON public.simulation_scenarios FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_sim_scenarios" ON public.simulation_scenarios FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_sim_scenarios" ON public.simulation_scenarios FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_sim_scenarios_org ON public.simulation_scenarios(organization_id);

-- 3. simulation_subjects
CREATE TABLE public.simulation_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_code text NOT NULL DEFAULT '',
  subject_type text NOT NULL DEFAULT 'institution',
  subject_ref text,
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_sim_subjects" ON public.simulation_subjects FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_sim_subjects" ON public.simulation_subjects FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_sim_subjects" ON public.simulation_subjects FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_sim_subjects_org ON public.simulation_subjects(organization_id);

-- 4. scenario_simulation_runs
CREATE TABLE public.scenario_simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_id uuid REFERENCES public.continuity_simulation_constitutions(id),
  scenario_id uuid REFERENCES public.simulation_scenarios(id),
  subject_id uuid REFERENCES public.simulation_subjects(id),
  viability_score numeric NOT NULL DEFAULT 0,
  continuity_stress_score numeric NOT NULL DEFAULT 0,
  identity_preservation_score numeric NOT NULL DEFAULT 0,
  survivability_score numeric NOT NULL DEFAULT 0,
  simulation_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scenario_simulation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_sim_runs" ON public.scenario_simulation_runs FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_sim_runs" ON public.scenario_simulation_runs FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_sim_runs_org ON public.scenario_simulation_runs(organization_id);
CREATE INDEX idx_sim_runs_scenario ON public.scenario_simulation_runs(scenario_id);

-- 5. simulation_stress_points
CREATE TABLE public.simulation_stress_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  simulation_run_id uuid REFERENCES public.scenario_simulation_runs(id),
  stress_type text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',
  stress_summary text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_stress_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_stress_points" ON public.simulation_stress_points FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_stress_points" ON public.simulation_stress_points FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_stress_points_org ON public.simulation_stress_points(organization_id);

-- 6. simulation_recommendations
CREATE TABLE public.simulation_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  simulation_run_id uuid REFERENCES public.scenario_simulation_runs(id),
  recommendation_type text NOT NULL DEFAULT '',
  recommendation_summary text NOT NULL DEFAULT '',
  mitigation_priority text NOT NULL DEFAULT 'medium',
  rationale text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.simulation_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_sim_recommendations" ON public.simulation_recommendations FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_sim_recommendations" ON public.simulation_recommendations FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_sim_recommendations_org ON public.simulation_recommendations(organization_id);

-- 7. future_continuity_snapshots
CREATE TABLE public.future_continuity_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.simulation_scenarios(id),
  subject_id uuid REFERENCES public.simulation_subjects(id),
  future_state_type text NOT NULL DEFAULT 'stable' CHECK (future_state_type IN ('stable','strained','degraded','fragmented','collapsed','adaptive_recovery')),
  continuity_score numeric NOT NULL DEFAULT 0,
  snapshot_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.future_continuity_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_future_snapshots" ON public.future_continuity_snapshots FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_future_snapshots" ON public.future_continuity_snapshots FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_future_snapshots_org ON public.future_continuity_snapshots(organization_id);
