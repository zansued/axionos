
-- Sprint 48: Economic Optimization Layer

-- 1. architecture_economic_assessments
CREATE TABLE public.architecture_economic_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  change_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_type text NOT NULL DEFAULT 'architecture',
  projected_change_cost numeric DEFAULT 0,
  projected_operational_cost_delta numeric DEFAULT 0,
  projected_reliability_gain numeric DEFAULT 0,
  projected_stability_gain numeric DEFAULT 0,
  projected_rollback_cost numeric DEFAULT 0,
  tenant_divergence_cost numeric DEFAULT 0,
  cost_to_reliability_ratio numeric DEFAULT 0,
  cost_to_stability_ratio numeric DEFAULT 0,
  migration_roi_30d numeric DEFAULT 0,
  migration_roi_90d numeric DEFAULT 0,
  economic_tradeoff_score numeric DEFAULT 0,
  rollout_cost_envelope numeric DEFAULT 0,
  rollback_reserve_ratio numeric DEFAULT 0,
  forecast_variance_score numeric DEFAULT 0,
  economic_confidence_score numeric DEFAULT 0,
  evidence_refs jsonb DEFAULT '{}'::jsonb,
  rationale_codes jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_economic_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view economic assessments"
  ON public.architecture_economic_assessments FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert economic assessments"
  ON public.architecture_economic_assessments FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update economic assessments"
  ON public.architecture_economic_assessments FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_econ_assess_org ON public.architecture_economic_assessments(organization_id);
CREATE INDEX idx_econ_assess_status ON public.architecture_economic_assessments(status);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_economic_assessment()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','assessed','reviewed','accepted','rejected','outdated') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_economic_assessment
  BEFORE INSERT OR UPDATE ON public.architecture_economic_assessments
  FOR EACH ROW EXECUTE FUNCTION public.validate_economic_assessment();

-- 2. economic_tradeoff_scenarios
CREATE TABLE public.economic_tradeoff_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  assessment_id uuid NOT NULL REFERENCES public.architecture_economic_assessments(id),
  scenario_key text NOT NULL DEFAULT 'baseline',
  scenario_name text NOT NULL DEFAULT '',
  scenario_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  projected_cost numeric DEFAULT 0,
  projected_roi_30d numeric DEFAULT 0,
  projected_roi_90d numeric DEFAULT 0,
  rollback_exposure numeric DEFAULT 0,
  confidence_score numeric DEFAULT 0,
  tradeoff_score numeric DEFAULT 0,
  rationale_codes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.economic_tradeoff_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tradeoff scenarios"
  ON public.economic_tradeoff_scenarios FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert tradeoff scenarios"
  ON public.economic_tradeoff_scenarios FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_econ_scenarios_org ON public.economic_tradeoff_scenarios(organization_id);
CREATE INDEX idx_econ_scenarios_assess ON public.economic_tradeoff_scenarios(assessment_id);

-- 3. rollout_economic_plans
CREATE TABLE public.rollout_economic_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  assessment_id uuid NOT NULL REFERENCES public.architecture_economic_assessments(id),
  plan_name text NOT NULL DEFAULT '',
  phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_budget_envelope numeric DEFAULT 0,
  rollback_reserve numeric DEFAULT 0,
  stop_loss_thresholds jsonb DEFAULT '{}'::jsonb,
  confidence_score numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rollout_economic_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view rollout economic plans"
  ON public.rollout_economic_plans FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert rollout economic plans"
  ON public.rollout_economic_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update rollout economic plans"
  ON public.rollout_economic_plans FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_rollout_econ_org ON public.rollout_economic_plans(organization_id);

CREATE OR REPLACE FUNCTION public.validate_rollout_economic_plan()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','proposed','reviewed','accepted','rejected','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_rollout_economic_plan
  BEFORE INSERT OR UPDATE ON public.rollout_economic_plans
  FOR EACH ROW EXECUTE FUNCTION public.validate_rollout_economic_plan();

-- 4. economic_optimization_recommendations
CREATE TABLE public.economic_optimization_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  assessment_id uuid REFERENCES public.architecture_economic_assessments(id),
  recommendation_type text NOT NULL DEFAULT 'cost_reduction',
  target_scope text NOT NULL DEFAULT 'platform',
  target_entities jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendation_reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_value numeric DEFAULT 0,
  confidence_score numeric DEFAULT 0,
  priority_score numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.economic_optimization_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view econ recommendations"
  ON public.economic_optimization_recommendations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert econ recommendations"
  ON public.economic_optimization_recommendations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update econ recommendations"
  ON public.economic_optimization_recommendations FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_econ_rec_org ON public.economic_optimization_recommendations(organization_id);
CREATE INDEX idx_econ_rec_status ON public.economic_optimization_recommendations(status);

CREATE OR REPLACE FUNCTION public.validate_econ_recommendation()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','reviewed','accepted','rejected','dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_econ_recommendation
  BEFORE INSERT OR UPDATE ON public.economic_optimization_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.validate_econ_recommendation();

-- 5. economic_optimization_outcomes
CREATE TABLE public.economic_optimization_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  assessment_id uuid REFERENCES public.architecture_economic_assessments(id),
  recommendation_id uuid REFERENCES public.economic_optimization_recommendations(id),
  scope_ref jsonb DEFAULT '{}'::jsonb,
  projected_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  delta_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_status text NOT NULL DEFAULT 'inconclusive',
  forecast_error numeric DEFAULT 0,
  evidence_refs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.economic_optimization_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view econ outcomes"
  ON public.economic_optimization_outcomes FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert econ outcomes"
  ON public.economic_optimization_outcomes FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_econ_outcomes_org ON public.economic_optimization_outcomes(organization_id);

CREATE OR REPLACE FUNCTION public.validate_econ_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_econ_outcome
  BEFORE INSERT OR UPDATE ON public.economic_optimization_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_econ_outcome();
