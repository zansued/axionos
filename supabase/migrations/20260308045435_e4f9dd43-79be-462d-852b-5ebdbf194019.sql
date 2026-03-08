
-- Sprint 52: Operating Profiles & Policy Packs

-- 1. operating_profiles
CREATE TABLE public.operating_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  profile_name TEXT NOT NULL DEFAULT '',
  profile_type TEXT NOT NULL DEFAULT 'general',
  scope_type TEXT NOT NULL DEFAULT 'organization',
  profile_version INTEGER NOT NULL DEFAULT 1,
  source_memory_pattern_id UUID,
  source_governance_case_id UUID,
  source_convergence_decision_id UUID,
  policy_pack_ids JSONB NOT NULL DEFAULT '[]',
  architecture_mode_compatibility JSONB NOT NULL DEFAULT '{}',
  tenant_fit_score NUMERIC NOT NULL DEFAULT 0,
  stability_bias_score NUMERIC NOT NULL DEFAULT 0,
  cost_bias_score NUMERIC NOT NULL DEFAULT 0,
  speed_bias_score NUMERIC NOT NULL DEFAULT 0,
  governance_strictness_score NUMERIC NOT NULL DEFAULT 0,
  override_budget_score NUMERIC NOT NULL DEFAULT 0,
  rollback_viability_score NUMERIC NOT NULL DEFAULT 0,
  shared_reuse_score NUMERIC NOT NULL DEFAULT 0,
  profile_drift_score NUMERIC NOT NULL DEFAULT 0,
  adoption_status TEXT NOT NULL DEFAULT 'draft',
  review_status TEXT NOT NULL DEFAULT 'pending',
  assumptions JSONB NOT NULL DEFAULT '{}',
  expected_outcomes JSONB NOT NULL DEFAULT '{}',
  realized_outcomes JSONB NOT NULL DEFAULT '{}',
  evidence_links JSONB NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operating_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_op_profiles" ON public.operating_profiles FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_op_profiles" ON public.operating_profiles FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_op_profiles" ON public.operating_profiles FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_op_profiles_org ON public.operating_profiles(organization_id);
CREATE INDEX idx_op_profiles_status ON public.operating_profiles(adoption_status);

CREATE OR REPLACE FUNCTION public.validate_operating_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.scope_type NOT IN ('organization','workspace','initiative_type','architecture_mode','context_class') THEN
    RAISE EXCEPTION 'Invalid scope_type: %', NEW.scope_type;
  END IF;
  IF NEW.adoption_status NOT IN ('draft','candidate','active','watch','deprecated','archived') THEN
    RAISE EXCEPTION 'Invalid adoption_status: %', NEW.adoption_status;
  END IF;
  IF NEW.review_status NOT IN ('pending','under_review','approved','rejected','deferred') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_op_profile BEFORE INSERT OR UPDATE ON public.operating_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_operating_profile();

-- 2. policy_packs
CREATE TABLE public.policy_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  pack_name TEXT NOT NULL DEFAULT '',
  pack_type TEXT NOT NULL DEFAULT 'general',
  pack_version INTEGER NOT NULL DEFAULT 1,
  policy_definitions JSONB NOT NULL DEFAULT '[]',
  cohesion_score NUMERIC NOT NULL DEFAULT 0,
  compatibility_constraints JSONB NOT NULL DEFAULT '{}',
  reuse_footprint JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_policy_packs" ON public.policy_packs FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_policy_packs" ON public.policy_packs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_policy_packs" ON public.policy_packs FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_policy_packs_org ON public.policy_packs(organization_id);

CREATE OR REPLACE FUNCTION public.validate_policy_pack()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','active','watch','deprecated','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_policy_pack BEFORE INSERT OR UPDATE ON public.policy_packs FOR EACH ROW EXECUTE FUNCTION public.validate_policy_pack();

-- 3. operating_profile_bindings
CREATE TABLE public.operating_profile_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  profile_id UUID NOT NULL REFERENCES public.operating_profiles(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'organization',
  scope_id TEXT NOT NULL DEFAULT '',
  binding_status TEXT NOT NULL DEFAULT 'proposed',
  bound_at TIMESTAMPTZ,
  unbound_at TIMESTAMPTZ,
  reviewer_ref JSONB NOT NULL DEFAULT '{}',
  rollback_plan JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operating_profile_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_op_bindings" ON public.operating_profile_bindings FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_op_bindings" ON public.operating_profile_bindings FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_op_bindings" ON public.operating_profile_bindings FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_op_bindings_org ON public.operating_profile_bindings(organization_id);
CREATE INDEX idx_op_bindings_profile ON public.operating_profile_bindings(profile_id);

CREATE OR REPLACE FUNCTION public.validate_op_binding()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.binding_status NOT IN ('proposed','active','paused','rolled_back','archived') THEN
    RAISE EXCEPTION 'Invalid binding_status: %', NEW.binding_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_op_binding BEFORE INSERT OR UPDATE ON public.operating_profile_bindings FOR EACH ROW EXECUTE FUNCTION public.validate_op_binding();

-- 4. operating_profile_overrides
CREATE TABLE public.operating_profile_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  profile_id UUID NOT NULL REFERENCES public.operating_profiles(id) ON DELETE CASCADE,
  override_key TEXT NOT NULL DEFAULT '',
  override_value JSONB NOT NULL DEFAULT '{}',
  justification TEXT NOT NULL DEFAULT '',
  override_scope TEXT NOT NULL DEFAULT 'workspace',
  scope_id TEXT NOT NULL DEFAULT '',
  override_pressure_score NUMERIC NOT NULL DEFAULT 0,
  promotion_candidate BOOLEAN NOT NULL DEFAULT false,
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewer_ref JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operating_profile_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_op_overrides" ON public.operating_profile_overrides FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_op_overrides" ON public.operating_profile_overrides FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_op_overrides" ON public.operating_profile_overrides FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_op_overrides_org ON public.operating_profile_overrides(organization_id);
CREATE INDEX idx_op_overrides_profile ON public.operating_profile_overrides(profile_id);

CREATE OR REPLACE FUNCTION public.validate_op_override()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('pending','approved','rejected','deferred') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_op_override BEFORE INSERT OR UPDATE ON public.operating_profile_overrides FOR EACH ROW EXECUTE FUNCTION public.validate_op_override();

-- 5. profile_adoption_reviews
CREATE TABLE public.profile_adoption_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  profile_id UUID NOT NULL REFERENCES public.operating_profiles(id) ON DELETE CASCADE,
  binding_id UUID REFERENCES public.operating_profile_bindings(id),
  review_type TEXT NOT NULL DEFAULT 'adoption',
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT NOT NULL DEFAULT '',
  reviewer_ref JSONB NOT NULL DEFAULT '{}',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_adoption_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_profile_reviews" ON public.profile_adoption_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_profile_reviews" ON public.profile_adoption_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_profile_reviews_org ON public.profile_adoption_reviews(organization_id);

CREATE OR REPLACE FUNCTION public.validate_profile_adoption_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('pending','approved','rejected','deferred','rolled_back') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  IF NEW.review_type NOT IN ('adoption','promotion','rollback','override_approval','deprecation') THEN
    RAISE EXCEPTION 'Invalid review_type: %', NEW.review_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_profile_adoption_review BEFORE INSERT OR UPDATE ON public.profile_adoption_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_profile_adoption_review();

-- 6. profile_outcomes
CREATE TABLE public.profile_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  profile_id UUID NOT NULL REFERENCES public.operating_profiles(id) ON DELETE CASCADE,
  binding_id UUID REFERENCES public.operating_profile_bindings(id),
  outcome_status TEXT NOT NULL DEFAULT 'pending',
  expected_stability_gain NUMERIC NOT NULL DEFAULT 0,
  realized_stability_gain NUMERIC NOT NULL DEFAULT 0,
  expected_cost_efficiency_gain NUMERIC NOT NULL DEFAULT 0,
  realized_cost_efficiency_gain NUMERIC NOT NULL DEFAULT 0,
  expected_speed_gain NUMERIC NOT NULL DEFAULT 0,
  realized_speed_gain NUMERIC NOT NULL DEFAULT 0,
  expected_fragmentation_reduction NUMERIC NOT NULL DEFAULT 0,
  realized_fragmentation_reduction NUMERIC NOT NULL DEFAULT 0,
  profile_effectiveness_score NUMERIC NOT NULL DEFAULT 0,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_profile_outcomes" ON public.profile_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_profile_outcomes" ON public.profile_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_profile_outcomes_org ON public.profile_outcomes(organization_id);
CREATE INDEX idx_profile_outcomes_profile ON public.profile_outcomes(profile_id);

CREATE OR REPLACE FUNCTION public.validate_profile_outcome()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_profile_outcome BEFORE INSERT OR UPDATE ON public.profile_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_profile_outcome();
