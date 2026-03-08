
-- Sprint 56: Controlled Ecosystem Readiness Layer

-- 1. ecosystem_capability_inventory
CREATE TABLE public.ecosystem_capability_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  capability_name TEXT NOT NULL DEFAULT '',
  capability_domain TEXT NOT NULL DEFAULT 'general',
  capability_type TEXT NOT NULL DEFAULT 'internal',
  exposure_candidate_status TEXT NOT NULL DEFAULT 'unclassified',
  internal_criticality_score NUMERIC NOT NULL DEFAULT 0,
  dependency_sensitivity_score NUMERIC NOT NULL DEFAULT 0,
  externalization_risk_score NUMERIC NOT NULL DEFAULT 0,
  auditability_score NUMERIC NOT NULL DEFAULT 0,
  exposure_restriction_score NUMERIC NOT NULL DEFAULT 0,
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecosystem_capability_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.ecosystem_capability_inventory FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- 2. ecosystem_exposure_readiness_assessments
CREATE TABLE public.ecosystem_exposure_readiness_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  capability_id UUID REFERENCES public.ecosystem_capability_inventory(id),
  assessment_scope_type TEXT NOT NULL DEFAULT 'capability',
  assessment_scope_id TEXT NOT NULL DEFAULT '',
  ecosystem_readiness_score NUMERIC NOT NULL DEFAULT 0,
  safety_prerequisite_score NUMERIC NOT NULL DEFAULT 0,
  policy_readiness_score NUMERIC NOT NULL DEFAULT 0,
  trust_requirement_score NUMERIC NOT NULL DEFAULT 0,
  blast_radius_readiness_score NUMERIC NOT NULL DEFAULT 0,
  readiness_status TEXT NOT NULL DEFAULT 'not_assessed',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecosystem_exposure_readiness_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.ecosystem_exposure_readiness_assessments FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- 3. ecosystem_safety_prerequisites
CREATE TABLE public.ecosystem_safety_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  capability_id UUID REFERENCES public.ecosystem_capability_inventory(id),
  prerequisite_name TEXT NOT NULL DEFAULT '',
  prerequisite_domain TEXT NOT NULL DEFAULT 'general',
  prerequisite_type TEXT NOT NULL DEFAULT 'governance',
  is_met BOOLEAN NOT NULL DEFAULT false,
  severity TEXT NOT NULL DEFAULT 'required',
  gap_description TEXT NOT NULL DEFAULT '',
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecosystem_safety_prerequisites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.ecosystem_safety_prerequisites FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- 4. ecosystem_trust_model_candidates
CREATE TABLE public.ecosystem_trust_model_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  trust_model_type TEXT NOT NULL DEFAULT 'admission_based',
  trust_model_name TEXT NOT NULL DEFAULT '',
  trust_level_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  trust_boundary_assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  trust_model_confidence_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecosystem_trust_model_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.ecosystem_trust_model_candidates FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- 5. ecosystem_exposure_policies
CREATE TABLE public.ecosystem_exposure_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  policy_name TEXT NOT NULL DEFAULT '',
  policy_domain TEXT NOT NULL DEFAULT 'general',
  policy_scope TEXT NOT NULL DEFAULT 'platform',
  policy_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy_readiness_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecosystem_exposure_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.ecosystem_exposure_policies FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- 6. ecosystem_readiness_outcomes
CREATE TABLE public.ecosystem_readiness_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  assessment_id UUID REFERENCES public.ecosystem_exposure_readiness_assessments(id),
  recommendation_type TEXT NOT NULL DEFAULT 'recommend_prepare',
  recommendation_status TEXT NOT NULL DEFAULT 'open',
  expected_outcomes JSONB NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome_status TEXT NOT NULL DEFAULT 'pending',
  readiness_recommendation_quality_score NUMERIC NOT NULL DEFAULT 0,
  readiness_outcome_accuracy_score NUMERIC NOT NULL DEFAULT 0,
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecosystem_readiness_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.ecosystem_readiness_outcomes FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_ecosystem_capability_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.exposure_candidate_status NOT IN ('unclassified','candidate','restricted','internal_only','never_expose') THEN
    RAISE EXCEPTION 'Invalid exposure_candidate_status: %', NEW.exposure_candidate_status;
  END IF;
  RETURN NEW;
END; $function$;

CREATE TRIGGER trg_validate_ecosystem_capability_status
  BEFORE INSERT OR UPDATE ON public.ecosystem_capability_inventory
  FOR EACH ROW EXECUTE FUNCTION public.validate_ecosystem_capability_status();

CREATE OR REPLACE FUNCTION public.validate_ecosystem_readiness_outcome()
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

CREATE TRIGGER trg_validate_ecosystem_readiness_outcome
  BEFORE INSERT OR UPDATE ON public.ecosystem_readiness_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_ecosystem_readiness_outcome();

CREATE OR REPLACE FUNCTION public.validate_ecosystem_trust_model()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.status NOT IN ('draft','proposed','reviewed','accepted','rejected','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $function$;

CREATE TRIGGER trg_validate_ecosystem_trust_model
  BEFORE INSERT OR UPDATE ON public.ecosystem_trust_model_candidates
  FOR EACH ROW EXECUTE FUNCTION public.validate_ecosystem_trust_model();
