
-- Sprint 59: Ecosystem Simulation & Sandbox Layer

-- 1. ecosystem_sandbox_scenarios
CREATE TABLE public.ecosystem_sandbox_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  scenario_name text NOT NULL,
  scenario_type text NOT NULL DEFAULT 'capability_exposure',
  capability_name text NOT NULL DEFAULT '',
  capability_domain text NOT NULL DEFAULT 'unknown',
  exposure_class text NOT NULL DEFAULT 'restricted',
  simulated_actor_type text NOT NULL DEFAULT 'unknown',
  simulated_trust_tier text NOT NULL DEFAULT 'unknown',
  sandbox_scope_type text NOT NULL DEFAULT 'bounded',
  simulation_readiness_score numeric NOT NULL DEFAULT 0,
  sandbox_safety_score numeric NOT NULL DEFAULT 0,
  activation_readiness_signal text NOT NULL DEFAULT 'not_ready',
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecosystem_sandbox_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_sandbox_scenarios" ON public.ecosystem_sandbox_scenarios FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_sandbox_scenarios" ON public.ecosystem_sandbox_scenarios FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_sandbox_scenarios" ON public.ecosystem_sandbox_scenarios FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. ecosystem_simulation_runs
CREATE TABLE public.ecosystem_simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.ecosystem_sandbox_scenarios(id) ON DELETE SET NULL,
  run_status text NOT NULL DEFAULT 'pending',
  policy_conflict_score numeric NOT NULL DEFAULT 0,
  trust_failure_score numeric NOT NULL DEFAULT 0,
  blast_radius_score numeric NOT NULL DEFAULT 0,
  rollback_viability_score numeric NOT NULL DEFAULT 0,
  containment_quality_score numeric NOT NULL DEFAULT 0,
  scenario_confidence_score numeric NOT NULL DEFAULT 0,
  simulation_outcome_accuracy_score numeric NOT NULL DEFAULT 0,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecosystem_simulation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_simulation_runs" ON public.ecosystem_simulation_runs FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_simulation_runs" ON public.ecosystem_simulation_runs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 3. ecosystem_simulation_participants
CREATE TABLE public.ecosystem_simulation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.ecosystem_sandbox_scenarios(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.ecosystem_simulation_runs(id) ON DELETE SET NULL,
  participant_name text NOT NULL,
  participant_type text NOT NULL DEFAULT 'external',
  simulated_trust_tier text NOT NULL DEFAULT 'unknown',
  simulated_participation_viability_score numeric NOT NULL DEFAULT 0,
  restriction_violation_score numeric NOT NULL DEFAULT 0,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecosystem_simulation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_sim_participants" ON public.ecosystem_simulation_participants FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_sim_participants" ON public.ecosystem_simulation_participants FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. ecosystem_policy_conflict_events
CREATE TABLE public.ecosystem_policy_conflict_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.ecosystem_sandbox_scenarios(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.ecosystem_simulation_runs(id) ON DELETE SET NULL,
  conflict_type text NOT NULL DEFAULT 'policy_collision',
  severity text NOT NULL DEFAULT 'moderate',
  description text NOT NULL DEFAULT '',
  affected_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecosystem_policy_conflict_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_policy_conflicts" ON public.ecosystem_policy_conflict_events FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_policy_conflicts" ON public.ecosystem_policy_conflict_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 5. ecosystem_blast_radius_estimates
CREATE TABLE public.ecosystem_blast_radius_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.ecosystem_sandbox_scenarios(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.ecosystem_simulation_runs(id) ON DELETE SET NULL,
  blast_radius_score numeric NOT NULL DEFAULT 0,
  rollback_viability_score numeric NOT NULL DEFAULT 0,
  containment_quality_score numeric NOT NULL DEFAULT 0,
  affected_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  rollback_strategies jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecosystem_blast_radius_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_blast_radius" ON public.ecosystem_blast_radius_estimates FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_blast_radius" ON public.ecosystem_blast_radius_estimates FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 6. ecosystem_simulation_outcomes
CREATE TABLE public.ecosystem_simulation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.ecosystem_sandbox_scenarios(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.ecosystem_simulation_runs(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL DEFAULT 'unknown',
  recommendation_quality_score numeric NOT NULL DEFAULT 0,
  false_positive_activation_risk_score numeric NOT NULL DEFAULT 0,
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_status text NOT NULL DEFAULT 'pending',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecosystem_simulation_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_sim_outcomes" ON public.ecosystem_simulation_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_sim_outcomes" ON public.ecosystem_simulation_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_sim_outcomes" ON public.ecosystem_simulation_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_ecosystem_sandbox_scenario()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','ready','running','completed','failed','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_ecosystem_sandbox_scenario BEFORE INSERT OR UPDATE ON public.ecosystem_sandbox_scenarios FOR EACH ROW EXECUTE FUNCTION public.validate_ecosystem_sandbox_scenario();

CREATE OR REPLACE FUNCTION public.validate_ecosystem_simulation_run()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.run_status NOT IN ('pending','running','completed','failed') THEN
    RAISE EXCEPTION 'Invalid run_status: %', NEW.run_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_ecosystem_simulation_run BEFORE INSERT OR UPDATE ON public.ecosystem_simulation_runs FOR EACH ROW EXECUTE FUNCTION public.validate_ecosystem_simulation_run();

CREATE OR REPLACE FUNCTION public.validate_ecosystem_simulation_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_ecosystem_simulation_outcome BEFORE INSERT OR UPDATE ON public.ecosystem_simulation_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_ecosystem_simulation_outcome();
