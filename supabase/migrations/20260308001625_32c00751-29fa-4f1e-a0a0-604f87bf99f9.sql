
-- Sprint 39: Architecture Change Planning & Rollout Readiness

-- 1. Architecture Change Plans
CREATE TABLE public.architecture_change_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  proposal_id uuid NOT NULL REFERENCES public.architecture_change_proposals(id),
  simulation_outcome_id uuid NOT NULL REFERENCES public.architecture_simulation_outcomes(id),
  plan_name text NOT NULL,
  target_scope text NOT NULL,
  plan_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  blast_radius jsonb NULL,
  dependency_graph jsonb NULL,
  rollback_blueprint jsonb NULL,
  validation_requirements jsonb NULL,
  readiness_score numeric NULL,
  implementation_risk text NOT NULL DEFAULT 'moderate',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Architecture Rollout Mode Profiles
CREATE TABLE public.architecture_rollout_mode_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  profile_key text NOT NULL,
  profile_name text NOT NULL,
  rollout_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  max_scope_breadth numeric NULL,
  required_review_depth text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, profile_key)
);

-- 3. Architecture Change Plan Reviews
CREATE TABLE public.architecture_change_plan_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  plan_id uuid NOT NULL REFERENCES public.architecture_change_plans(id),
  reviewer_ref jsonb NULL,
  review_status text NOT NULL DEFAULT 'reviewed',
  review_notes text NULL,
  blocker_reasons jsonb NULL,
  linked_changes jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_architecture_change_plan()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.implementation_risk NOT IN ('low','moderate','high','critical') THEN
    RAISE EXCEPTION 'Invalid implementation_risk: %', NEW.implementation_risk;
  END IF;
  IF NEW.status NOT IN ('draft','reviewed','ready_for_rollout','blocked','rejected','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_change_plan
  BEFORE INSERT OR UPDATE ON public.architecture_change_plans
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_change_plan();

CREATE OR REPLACE FUNCTION public.validate_architecture_rollout_mode_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.required_review_depth NOT IN ('standard','elevated','strict') THEN
    RAISE EXCEPTION 'Invalid required_review_depth: %', NEW.required_review_depth;
  END IF;
  IF NEW.status NOT IN ('active','watch','deprecated') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_rollout_mode_profile
  BEFORE INSERT OR UPDATE ON public.architecture_rollout_mode_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_rollout_mode_profile();

CREATE OR REPLACE FUNCTION public.validate_architecture_change_plan_review()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed','ready_for_rollout','blocked','rejected','archived') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_change_plan_review
  BEFORE INSERT OR UPDATE ON public.architecture_change_plan_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_change_plan_review();

-- RLS
ALTER TABLE public.architecture_change_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_rollout_mode_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_change_plan_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view architecture_change_plans" ON public.architecture_change_plans
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_change_plans" ON public.architecture_change_plans
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update architecture_change_plans" ON public.architecture_change_plans
  FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view architecture_rollout_mode_profiles" ON public.architecture_rollout_mode_profiles
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_rollout_mode_profiles" ON public.architecture_rollout_mode_profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update architecture_rollout_mode_profiles" ON public.architecture_rollout_mode_profiles
  FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view architecture_change_plan_reviews" ON public.architecture_change_plan_reviews
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_change_plan_reviews" ON public.architecture_change_plan_reviews
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Service role policies for edge functions
CREATE POLICY "Service role full access architecture_change_plans" ON public.architecture_change_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access architecture_rollout_mode_profiles" ON public.architecture_rollout_mode_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access architecture_change_plan_reviews" ON public.architecture_change_plan_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);
