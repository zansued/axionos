
-- Sprint 40: Architecture Rollout Sandbox & Controlled Migration Readiness

-- 1. Architecture Rollout Sandboxes
CREATE TABLE public.architecture_rollout_sandboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  plan_id uuid NOT NULL REFERENCES public.architecture_change_plans(id),
  sandbox_name text NOT NULL,
  sandbox_scope text NOT NULL,
  sandbox_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  rehearsal_mode text NOT NULL DEFAULT 'dry_run',
  rollout_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_hooks jsonb NULL,
  rollback_hooks jsonb NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Architecture Validation Hooks
CREATE TABLE public.architecture_validation_hooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  hook_key text NOT NULL,
  hook_name text NOT NULL,
  hook_scope text NOT NULL,
  hook_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, hook_key)
);

-- 3. Architecture Rollout Sandbox Outcomes
CREATE TABLE public.architecture_rollout_sandbox_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  sandbox_id uuid NOT NULL REFERENCES public.architecture_rollout_sandboxes(id),
  rehearsal_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocked_steps jsonb NULL,
  fragility_findings jsonb NULL,
  readiness_summary jsonb NULL,
  rollback_viability_summary jsonb NULL,
  outcome_status text NOT NULL DEFAULT 'inconclusive',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Architecture Rollout Governance Profiles
CREATE TABLE public.architecture_rollout_governance_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  profile_key text NOT NULL,
  profile_name text NOT NULL,
  profile_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  max_scope_breadth numeric NULL,
  required_validation_depth text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, profile_key)
);

-- 5. Architecture Rollout Sandbox Reviews
CREATE TABLE public.architecture_rollout_sandbox_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  sandbox_outcome_id uuid NOT NULL REFERENCES public.architecture_rollout_sandbox_outcomes(id),
  reviewer_ref jsonb NULL,
  review_status text NOT NULL DEFAULT 'reviewed',
  review_notes text NULL,
  blocker_reasons jsonb NULL,
  linked_changes jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_architecture_rollout_sandbox()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rehearsal_mode NOT IN ('dry_run','staged_preview','shadow_readiness') THEN
    RAISE EXCEPTION 'Invalid rehearsal_mode: %', NEW.rehearsal_mode;
  END IF;
  IF NEW.status NOT IN ('draft','prepared','active','completed','blocked','expired','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_rollout_sandbox
  BEFORE INSERT OR UPDATE ON public.architecture_rollout_sandboxes
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_rollout_sandbox();

CREATE OR REPLACE FUNCTION public.validate_architecture_validation_hook()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','watch','deprecated') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_validation_hook
  BEFORE INSERT OR UPDATE ON public.architecture_validation_hooks
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_validation_hook();

CREATE OR REPLACE FUNCTION public.validate_architecture_rollout_sandbox_outcome()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_rollout_sandbox_outcome
  BEFORE INSERT OR UPDATE ON public.architecture_rollout_sandbox_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_rollout_sandbox_outcome();

CREATE OR REPLACE FUNCTION public.validate_architecture_rollout_governance_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.required_validation_depth NOT IN ('standard','elevated','strict') THEN
    RAISE EXCEPTION 'Invalid required_validation_depth: %', NEW.required_validation_depth;
  END IF;
  IF NEW.status NOT IN ('active','watch','deprecated') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_rollout_governance_profile
  BEFORE INSERT OR UPDATE ON public.architecture_rollout_governance_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_rollout_governance_profile();

CREATE OR REPLACE FUNCTION public.validate_architecture_rollout_sandbox_review()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed','migration_ready','blocked','rejected','archived') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_architecture_rollout_sandbox_review
  BEFORE INSERT OR UPDATE ON public.architecture_rollout_sandbox_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_rollout_sandbox_review();

-- RLS
ALTER TABLE public.architecture_rollout_sandboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_validation_hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_rollout_sandbox_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_rollout_governance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_rollout_sandbox_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view architecture_rollout_sandboxes" ON public.architecture_rollout_sandboxes
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_rollout_sandboxes" ON public.architecture_rollout_sandboxes
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update architecture_rollout_sandboxes" ON public.architecture_rollout_sandboxes
  FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view architecture_validation_hooks" ON public.architecture_validation_hooks
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_validation_hooks" ON public.architecture_validation_hooks
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update architecture_validation_hooks" ON public.architecture_validation_hooks
  FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view architecture_rollout_sandbox_outcomes" ON public.architecture_rollout_sandbox_outcomes
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_rollout_sandbox_outcomes" ON public.architecture_rollout_sandbox_outcomes
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view architecture_rollout_governance_profiles" ON public.architecture_rollout_governance_profiles
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_rollout_governance_profiles" ON public.architecture_rollout_governance_profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update architecture_rollout_governance_profiles" ON public.architecture_rollout_governance_profiles
  FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view architecture_rollout_sandbox_reviews" ON public.architecture_rollout_sandbox_reviews
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_rollout_sandbox_reviews" ON public.architecture_rollout_sandbox_reviews
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Service role policies
CREATE POLICY "Service role full access architecture_rollout_sandboxes" ON public.architecture_rollout_sandboxes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access architecture_validation_hooks" ON public.architecture_validation_hooks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access architecture_rollout_sandbox_outcomes" ON public.architecture_rollout_sandbox_outcomes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access architecture_rollout_governance_profiles" ON public.architecture_rollout_governance_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access architecture_rollout_sandbox_reviews" ON public.architecture_rollout_sandbox_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);
