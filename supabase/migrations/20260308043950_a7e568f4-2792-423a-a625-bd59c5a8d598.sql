
-- Sprint 50: Convergence Governance & Promotion Layer

-- 1. convergence_governance_cases
CREATE TABLE public.convergence_governance_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  source_candidate_id UUID REFERENCES public.convergence_candidates(id),
  governance_case_type TEXT NOT NULL DEFAULT 'promotion_review',
  convergence_domain TEXT NOT NULL DEFAULT 'architecture_mode',
  proposed_action TEXT NOT NULL DEFAULT 'retain_local',
  proposed_scope TEXT NOT NULL DEFAULT 'organization',
  beneficial_specialization_score NUMERIC NOT NULL DEFAULT 0,
  fragmentation_risk_score NUMERIC NOT NULL DEFAULT 0,
  redundancy_score NUMERIC NOT NULL DEFAULT 0,
  economic_impact_score NUMERIC NOT NULL DEFAULT 0,
  stability_impact_score NUMERIC NOT NULL DEFAULT 0,
  rollback_complexity_score NUMERIC NOT NULL DEFAULT 0,
  promotion_readiness_score NUMERIC NOT NULL DEFAULT 0,
  retirement_readiness_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  review_status TEXT NOT NULL DEFAULT 'pending',
  evidence_links JSONB NOT NULL DEFAULT '{}',
  assumptions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. convergence_decisions
CREATE TABLE public.convergence_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  governance_case_id UUID NOT NULL REFERENCES public.convergence_governance_cases(id),
  decision_status TEXT NOT NULL DEFAULT 'pending',
  decision_rationale JSONB NOT NULL DEFAULT '{}',
  reviewer_notes TEXT NOT NULL DEFAULT '',
  reviewer_ref JSONB,
  approved_action TEXT,
  approved_scope TEXT,
  rollback_plan JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. convergence_promotion_plans
CREATE TABLE public.convergence_promotion_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  governance_case_id UUID REFERENCES public.convergence_governance_cases(id),
  decision_id UUID REFERENCES public.convergence_decisions(id),
  promotion_scope TEXT NOT NULL DEFAULT 'organization',
  source_pattern_ref JSONB NOT NULL DEFAULT '{}',
  target_default_ref JSONB NOT NULL DEFAULT '{}',
  promotion_readiness_score NUMERIC NOT NULL DEFAULT 0,
  rollout_plan JSONB NOT NULL DEFAULT '{}',
  rollback_plan JSONB NOT NULL DEFAULT '{}',
  blast_radius JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. convergence_retirement_plans
CREATE TABLE public.convergence_retirement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  governance_case_id UUID REFERENCES public.convergence_governance_cases(id),
  decision_id UUID REFERENCES public.convergence_decisions(id),
  target_pattern_ref JSONB NOT NULL DEFAULT '{}',
  retirement_type TEXT NOT NULL DEFAULT 'deprecate',
  retirement_readiness_score NUMERIC NOT NULL DEFAULT 0,
  dependency_impact JSONB NOT NULL DEFAULT '{}',
  migration_path JSONB NOT NULL DEFAULT '{}',
  rollback_plan JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. convergence_rollout_reviews
CREATE TABLE public.convergence_rollout_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  governance_case_id UUID REFERENCES public.convergence_governance_cases(id),
  rollout_safety_score NUMERIC NOT NULL DEFAULT 0,
  rollback_viability_score NUMERIC NOT NULL DEFAULT 0,
  blast_radius_score NUMERIC NOT NULL DEFAULT 0,
  dependency_coupling_score NUMERIC NOT NULL DEFAULT 0,
  staged_rollout_envelope JSONB NOT NULL DEFAULT '{}',
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. convergence_governance_outcomes
CREATE TABLE public.convergence_governance_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  governance_case_id UUID REFERENCES public.convergence_governance_cases(id),
  decision_id UUID REFERENCES public.convergence_decisions(id),
  expected_simplification_gain NUMERIC NOT NULL DEFAULT 0,
  realized_simplification_gain NUMERIC NOT NULL DEFAULT 0,
  expected_fragmentation_reduction NUMERIC NOT NULL DEFAULT 0,
  realized_fragmentation_reduction NUMERIC NOT NULL DEFAULT 0,
  expected_economic_gain NUMERIC NOT NULL DEFAULT 0,
  realized_economic_gain NUMERIC NOT NULL DEFAULT 0,
  expected_stability_gain NUMERIC NOT NULL DEFAULT 0,
  realized_stability_gain NUMERIC NOT NULL DEFAULT 0,
  outcome_accuracy_score NUMERIC NOT NULL DEFAULT 0,
  outcome_status TEXT NOT NULL DEFAULT 'pending',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.convergence_governance_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convergence_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convergence_promotion_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convergence_retirement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convergence_rollout_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convergence_governance_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage governance cases" ON public.convergence_governance_cases FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members manage convergence decisions" ON public.convergence_decisions FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members manage promotion plans" ON public.convergence_promotion_plans FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members manage retirement plans" ON public.convergence_retirement_plans FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members manage rollout reviews" ON public.convergence_rollout_reviews FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members manage governance outcomes" ON public.convergence_governance_outcomes FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Indexes
CREATE INDEX idx_conv_gov_cases_org_status ON public.convergence_governance_cases(organization_id, review_status);
CREATE INDEX idx_conv_decisions_org ON public.convergence_decisions(organization_id, decision_status);
CREATE INDEX idx_conv_promotion_plans_org ON public.convergence_promotion_plans(organization_id, status);
CREATE INDEX idx_conv_retirement_plans_org ON public.convergence_retirement_plans(organization_id, status);
CREATE INDEX idx_conv_rollout_reviews_org ON public.convergence_rollout_reviews(organization_id, review_status);
CREATE INDEX idx_conv_gov_outcomes_org ON public.convergence_governance_outcomes(organization_id, outcome_status);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_convergence_governance_case()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('pending','under_review','approved','rejected','deferred') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  IF NEW.proposed_action NOT IN ('retain_local','bounded_merge','promote_shared','deprecate','retire') THEN
    RAISE EXCEPTION 'Invalid proposed_action: %', NEW.proposed_action;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_conv_gov_case
  BEFORE INSERT OR UPDATE ON public.convergence_governance_cases
  FOR EACH ROW EXECUTE FUNCTION public.validate_convergence_governance_case();

CREATE OR REPLACE FUNCTION public.validate_convergence_decision()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.decision_status NOT IN ('pending','approved','rejected','deferred','rolled_back') THEN
    RAISE EXCEPTION 'Invalid decision_status: %', NEW.decision_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_conv_decision
  BEFORE INSERT OR UPDATE ON public.convergence_decisions
  FOR EACH ROW EXECUTE FUNCTION public.validate_convergence_decision();

CREATE OR REPLACE FUNCTION public.validate_convergence_gov_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_conv_gov_outcome
  BEFORE INSERT OR UPDATE ON public.convergence_governance_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_convergence_gov_outcome();
