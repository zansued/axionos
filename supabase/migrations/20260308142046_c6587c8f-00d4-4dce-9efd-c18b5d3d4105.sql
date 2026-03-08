
-- Sprint 58: External Trust & Admission Layer

-- 1. external_trust_tiers
CREATE TABLE public.external_trust_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tier_key text NOT NULL,
  tier_name text NOT NULL,
  tier_level int NOT NULL DEFAULT 0,
  tier_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  admission_implications jsonb NOT NULL DEFAULT '{}'::jsonb,
  restriction_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.external_trust_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_trust_tiers" ON public.external_trust_tiers FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_trust_tiers" ON public.external_trust_tiers FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_trust_tiers" ON public.external_trust_tiers FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. external_actor_registry
CREATE TABLE public.external_actor_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  external_actor_name text NOT NULL,
  external_actor_type text NOT NULL DEFAULT 'unknown',
  external_actor_scope text NOT NULL DEFAULT 'unknown',
  identity_confidence_score numeric NOT NULL DEFAULT 0,
  trust_tier_id uuid REFERENCES public.external_trust_tiers(id) ON DELETE SET NULL,
  restriction_level text NOT NULL DEFAULT 'restricted',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  classification_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.external_actor_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_actor_registry" ON public.external_actor_registry FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_actor_registry" ON public.external_actor_registry FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_actor_registry" ON public.external_actor_registry FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. external_admission_cases
CREATE TABLE public.external_admission_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.external_actor_registry(id) ON DELETE SET NULL,
  admission_case_type text NOT NULL DEFAULT 'standard',
  admission_readiness_score numeric NOT NULL DEFAULT 0,
  evidence_completeness_score numeric NOT NULL DEFAULT 0,
  auditability_score numeric NOT NULL DEFAULT 0,
  policy_alignment_score numeric NOT NULL DEFAULT 0,
  risk_score numeric NOT NULL DEFAULT 0,
  restriction_level text NOT NULL DEFAULT 'restricted',
  recommendation_status text NOT NULL DEFAULT 'pending',
  review_status text NOT NULL DEFAULT 'pending',
  decision_status text NOT NULL DEFAULT 'pending',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.external_admission_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_admission_cases" ON public.external_admission_cases FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_admission_cases" ON public.external_admission_cases FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_admission_cases" ON public.external_admission_cases FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 4. external_admission_requirements
CREATE TABLE public.external_admission_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  admission_case_id uuid REFERENCES public.external_admission_cases(id) ON DELETE SET NULL,
  requirement_type text NOT NULL DEFAULT 'evidence',
  requirement_name text NOT NULL,
  requirement_description text NOT NULL DEFAULT '',
  is_met boolean NOT NULL DEFAULT false,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  gap_description text,
  severity text NOT NULL DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.external_admission_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_admission_requirements" ON public.external_admission_requirements FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_admission_requirements" ON public.external_admission_requirements FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_admission_requirements" ON public.external_admission_requirements FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 5. external_admission_reviews
CREATE TABLE public.external_admission_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  admission_case_id uuid NOT NULL REFERENCES public.external_admission_cases(id) ON DELETE CASCADE,
  review_status text NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewer_ref jsonb,
  review_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.external_admission_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_admission_reviews" ON public.external_admission_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_admission_reviews" ON public.external_admission_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_admission_reviews" ON public.external_admission_reviews FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 6. external_trust_outcomes
CREATE TABLE public.external_trust_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  admission_case_id uuid REFERENCES public.external_admission_cases(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.external_actor_registry(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL DEFAULT 'unknown',
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_status text NOT NULL DEFAULT 'pending',
  admission_outcome_accuracy_score numeric NOT NULL DEFAULT 0,
  trust_drift_score numeric NOT NULL DEFAULT 0,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.external_trust_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_trust_outcomes" ON public.external_trust_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_trust_outcomes" ON public.external_trust_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_trust_outcomes" ON public.external_trust_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_external_admission_case()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('pending','under_review','restricted','delayed','rejected','sandbox_eligible_future','controlled_future_candidate') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  IF NEW.decision_status NOT IN ('pending','approved_for_review','delayed','rejected','restricted','future_candidate') THEN
    RAISE EXCEPTION 'Invalid decision_status: %', NEW.decision_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_external_admission_case BEFORE INSERT OR UPDATE ON public.external_admission_cases FOR EACH ROW EXECUTE FUNCTION public.validate_external_admission_case();

CREATE OR REPLACE FUNCTION public.validate_external_admission_review()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('pending','under_review','restricted','delayed','rejected','sandbox_eligible_future','controlled_future_candidate','archived') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_external_admission_review BEFORE INSERT OR UPDATE ON public.external_admission_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_external_admission_review();

CREATE OR REPLACE FUNCTION public.validate_external_trust_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_external_trust_outcome BEFORE INSERT OR UPDATE ON public.external_trust_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_external_trust_outcome();
