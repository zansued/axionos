
-- Sprint 57: Capability Exposure Governance Layer

-- 1. capability_exposure_classes
CREATE TABLE public.capability_exposure_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  class_key TEXT NOT NULL DEFAULT '',
  class_name TEXT NOT NULL DEFAULT '',
  class_description TEXT NOT NULL DEFAULT '',
  restriction_level TEXT NOT NULL DEFAULT 'restricted',
  policy_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  trust_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  audit_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_exposure_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.capability_exposure_classes FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- 2. capability_exposure_governance_cases
CREATE TABLE public.capability_exposure_governance_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  capability_name TEXT NOT NULL DEFAULT '',
  capability_domain TEXT NOT NULL DEFAULT 'general',
  capability_type TEXT NOT NULL DEFAULT 'internal',
  exposure_case_type TEXT NOT NULL DEFAULT 'assessment',
  exposure_class_id UUID REFERENCES public.capability_exposure_classes(id),
  current_readiness_score NUMERIC NOT NULL DEFAULT 0,
  safety_gate_score NUMERIC NOT NULL DEFAULT 0,
  trust_gate_score NUMERIC NOT NULL DEFAULT 0,
  policy_gate_score NUMERIC NOT NULL DEFAULT 0,
  auditability_score NUMERIC NOT NULL DEFAULT 0,
  dependency_sensitivity_score NUMERIC NOT NULL DEFAULT 0,
  criticality_score NUMERIC NOT NULL DEFAULT 0,
  exposure_governance_score NUMERIC NOT NULL DEFAULT 0,
  exposure_recommendation_status TEXT NOT NULL DEFAULT 'pending',
  review_status TEXT NOT NULL DEFAULT 'pending',
  decision_status TEXT NOT NULL DEFAULT 'open',
  restriction_level TEXT NOT NULL DEFAULT 'restricted',
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_exposure_governance_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.capability_exposure_governance_cases FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- 3. capability_exposure_policies (note: ecosystem_exposure_policies already exists from Sprint 56, this is a separate governance-scoped table)
CREATE TABLE public.capability_exposure_governance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  exposure_class_id UUID REFERENCES public.capability_exposure_classes(id),
  policy_name TEXT NOT NULL DEFAULT '',
  policy_domain TEXT NOT NULL DEFAULT 'general',
  policy_scope TEXT NOT NULL DEFAULT 'platform',
  gate_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  restriction_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_exposure_governance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.capability_exposure_governance_policies FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- 4. capability_exposure_reviews
CREATE TABLE public.capability_exposure_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  governance_case_id UUID NOT NULL REFERENCES public.capability_exposure_governance_cases(id),
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewer_ref JSONB DEFAULT NULL,
  review_notes TEXT NOT NULL DEFAULT '',
  review_decision TEXT NOT NULL DEFAULT 'pending',
  gate_evaluation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_exposure_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.capability_exposure_reviews FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- 5. capability_exposure_restrictions
CREATE TABLE public.capability_exposure_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  governance_case_id UUID REFERENCES public.capability_exposure_governance_cases(id),
  capability_name TEXT NOT NULL DEFAULT '',
  restriction_type TEXT NOT NULL DEFAULT 'internal_only',
  restriction_severity TEXT NOT NULL DEFAULT 'hard',
  dependency_constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
  policy_limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
  rationale TEXT NOT NULL DEFAULT '',
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_exposure_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.capability_exposure_restrictions FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- 6. capability_exposure_governance_outcomes
CREATE TABLE public.capability_exposure_governance_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  governance_case_id UUID REFERENCES public.capability_exposure_governance_cases(id),
  review_id UUID REFERENCES public.capability_exposure_reviews(id),
  recommendation_type TEXT NOT NULL DEFAULT 'recommend_restrict',
  recommendation_status TEXT NOT NULL DEFAULT 'open',
  expected_outcomes JSONB NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome_status TEXT NOT NULL DEFAULT 'pending',
  governance_outcome_accuracy_score NUMERIC NOT NULL DEFAULT 0,
  exposure_recommendation_quality_score NUMERIC NOT NULL DEFAULT 0,
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_exposure_governance_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.capability_exposure_governance_outcomes FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_exposure_governance_case()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.review_status NOT IN ('pending','under_review','approved_for_future','delayed','rejected','restricted') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  IF NEW.decision_status NOT IN ('open','reviewed','approved','rejected','deferred','restricted') THEN
    RAISE EXCEPTION 'Invalid decision_status: %', NEW.decision_status;
  END IF;
  RETURN NEW;
END; $function$;

CREATE TRIGGER trg_validate_exposure_governance_case
  BEFORE INSERT OR UPDATE ON public.capability_exposure_governance_cases
  FOR EACH ROW EXECUTE FUNCTION public.validate_exposure_governance_case();

CREATE OR REPLACE FUNCTION public.validate_exposure_review()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.review_status NOT IN ('pending','under_review','completed','dismissed') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  IF NEW.review_decision NOT IN ('pending','approve_future_candidate','delay','reject','restrict','needs_more_evidence') THEN
    RAISE EXCEPTION 'Invalid review_decision: %', NEW.review_decision;
  END IF;
  RETURN NEW;
END; $function$;

CREATE TRIGGER trg_validate_exposure_review
  BEFORE INSERT OR UPDATE ON public.capability_exposure_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_exposure_review();

CREATE OR REPLACE FUNCTION public.validate_exposure_governance_outcome()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  IF NEW.recommendation_status NOT IN ('open','reviewed','accepted','rejected','dismissed') THEN
    RAISE EXCEPTION 'Invalid recommendation_status: %', NEW.recommendation_status;
  END IF;
  RETURN NEW;
END; $function$;

CREATE TRIGGER trg_validate_exposure_governance_outcome
  BEFORE INSERT OR UPDATE ON public.capability_exposure_governance_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_exposure_governance_outcome();

CREATE OR REPLACE FUNCTION public.validate_exposure_restriction()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.restriction_type NOT IN ('internal_only','never_expose','partner_limited','sandbox_only','controlled_future_candidate') THEN
    RAISE EXCEPTION 'Invalid restriction_type: %', NEW.restriction_type;
  END IF;
  IF NEW.restriction_severity NOT IN ('hard','soft','advisory') THEN
    RAISE EXCEPTION 'Invalid restriction_severity: %', NEW.restriction_severity;
  END IF;
  RETURN NEW;
END; $function$;

CREATE TRIGGER trg_validate_exposure_restriction
  BEFORE INSERT OR UPDATE ON public.capability_exposure_restrictions
  FOR EACH ROW EXECUTE FUNCTION public.validate_exposure_restriction();
