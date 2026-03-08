
-- Sprint 38: Architecture Change Simulation & Governance

-- 1. Architecture Change Proposals
CREATE TABLE public.architecture_change_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  proposal_type text NOT NULL,
  target_scope text NOT NULL,
  target_entities jsonb NOT NULL DEFAULT '{}',
  proposal_payload jsonb NOT NULL DEFAULT '{}',
  source_recommendation_id uuid NULL REFERENCES public.discovery_architecture_recommendations(id),
  confidence_score numeric NULL,
  priority_score numeric NULL,
  safety_class text NOT NULL DEFAULT 'advisory_only',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Architecture Simulation Scope Profiles
CREATE TABLE public.architecture_simulation_scope_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  scope_key text NOT NULL,
  scope_name text NOT NULL,
  allowed_entities jsonb NOT NULL DEFAULT '[]',
  forbidden_entities jsonb NOT NULL DEFAULT '[]',
  max_scope_breadth numeric NULL,
  simulation_mode text NOT NULL DEFAULT 'local_only',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, scope_key)
);

-- 3. Architecture Simulation Outcomes
CREATE TABLE public.architecture_simulation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  proposal_id uuid NOT NULL REFERENCES public.architecture_change_proposals(id),
  scope_profile_id uuid NOT NULL REFERENCES public.architecture_simulation_scope_profiles(id),
  affected_layers jsonb NOT NULL DEFAULT '[]',
  expected_benefits jsonb NULL,
  expected_tradeoffs jsonb NULL,
  risk_flags jsonb NULL,
  confidence_score numeric NULL,
  simulation_summary jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'generated',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Architecture Simulation Reviews
CREATE TABLE public.architecture_simulation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  simulation_outcome_id uuid NOT NULL REFERENCES public.architecture_simulation_outcomes(id),
  reviewer_ref jsonb NULL,
  review_status text NOT NULL DEFAULT 'reviewed',
  review_notes text NULL,
  review_reason_codes jsonb NULL,
  linked_changes jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.architecture_change_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_simulation_scope_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_simulation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_simulation_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view org proposals" ON public.architecture_change_proposals
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert org proposals" ON public.architecture_change_proposals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can update org proposals" ON public.architecture_change_proposals
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can view org scope profiles" ON public.architecture_simulation_scope_profiles
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert org scope profiles" ON public.architecture_simulation_scope_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can update org scope profiles" ON public.architecture_simulation_scope_profiles
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can view org simulation outcomes" ON public.architecture_simulation_outcomes
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert org simulation outcomes" ON public.architecture_simulation_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can update org simulation outcomes" ON public.architecture_simulation_outcomes
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can view org simulation reviews" ON public.architecture_simulation_reviews
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert org simulation reviews" ON public.architecture_simulation_reviews
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_architecture_change_proposal()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.safety_class NOT IN ('advisory_only','high_review_required') THEN
    RAISE EXCEPTION 'Invalid safety_class: %', NEW.safety_class;
  END IF;
  IF NEW.status NOT IN ('draft','reviewed','approved_for_simulation','simulated','accepted','rejected','dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_change_proposal
  BEFORE INSERT OR UPDATE ON public.architecture_change_proposals
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_change_proposal();

CREATE OR REPLACE FUNCTION public.validate_architecture_simulation_scope()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.simulation_mode NOT IN ('local_only','cross_layer_bounded','platform_preview') THEN
    RAISE EXCEPTION 'Invalid simulation_mode: %', NEW.simulation_mode;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_simulation_scope
  BEFORE INSERT OR UPDATE ON public.architecture_simulation_scope_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_simulation_scope();

CREATE OR REPLACE FUNCTION public.validate_architecture_simulation_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('generated','reviewed','accepted','rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_simulation_outcome
  BEFORE INSERT OR UPDATE ON public.architecture_simulation_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_simulation_outcome();

CREATE OR REPLACE FUNCTION public.validate_architecture_simulation_review()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed','accepted','rejected','dismissed') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_simulation_review
  BEFORE INSERT OR UPDATE ON public.architecture_simulation_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_simulation_review();

-- Service role policies for edge functions
CREATE POLICY "Service role full access proposals" ON public.architecture_change_proposals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access scope profiles" ON public.architecture_simulation_scope_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access simulation outcomes" ON public.architecture_simulation_outcomes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access simulation reviews" ON public.architecture_simulation_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);
