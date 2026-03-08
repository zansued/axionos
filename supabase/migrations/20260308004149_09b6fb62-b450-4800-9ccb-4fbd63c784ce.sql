
-- Sprint 42: Controlled Architecture Migration Execution

-- 1. Migration Executions
CREATE TABLE public.architecture_migration_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  plan_id uuid NOT NULL REFERENCES public.architecture_change_plans(id),
  pilot_id uuid REFERENCES public.architecture_rollout_pilots(id),
  migration_name text NOT NULL,
  target_scope text NOT NULL,
  rollout_profile jsonb NOT NULL DEFAULT '{}',
  migration_state text NOT NULL DEFAULT 'draft',
  phase_sequence jsonb NOT NULL DEFAULT '[]',
  active_phase integer NOT NULL DEFAULT 0,
  baseline_ref jsonb NOT NULL DEFAULT '{}',
  rollback_blueprint jsonb NOT NULL DEFAULT '{}',
  validation_blueprint jsonb NOT NULL DEFAULT '{}',
  activation_constraints jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_migration_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_migration_exec" ON public.architecture_migration_executions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_migration_exec" ON public.architecture_migration_executions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_migration_exec" ON public.architecture_migration_executions FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_migration_execution_state() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.migration_state NOT IN ('draft','approved','preparing','checkpoint_ready','executing','paused','completed','rolled_back','failed','archived') THEN RAISE EXCEPTION 'Invalid migration_state: %', NEW.migration_state; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_migration_execution BEFORE INSERT OR UPDATE ON public.architecture_migration_executions FOR EACH ROW EXECUTE FUNCTION public.validate_migration_execution_state();

-- 2. Migration Outcomes
CREATE TABLE public.architecture_migration_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  migration_execution_id uuid NOT NULL REFERENCES public.architecture_migration_executions(id),
  phase_number integer NOT NULL DEFAULT 0,
  scope_slice jsonb NOT NULL DEFAULT '{}',
  baseline_summary jsonb NOT NULL DEFAULT '{}',
  migration_summary jsonb NOT NULL DEFAULT '{}',
  delta_summary jsonb NOT NULL DEFAULT '{}',
  outcome_status text NOT NULL DEFAULT 'inconclusive',
  risk_flags jsonb,
  evidence_refs jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_migration_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_migration_outcomes" ON public.architecture_migration_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_migration_outcomes" ON public.architecture_migration_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_migration_outcome_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('helpful','neutral','harmful','inconclusive') THEN RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_migration_outcome BEFORE INSERT OR UPDATE ON public.architecture_migration_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_migration_outcome_status();

-- 3. Migration Rollbacks
CREATE TABLE public.architecture_migration_rollbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  migration_execution_id uuid NOT NULL REFERENCES public.architecture_migration_executions(id),
  rollback_scope text NOT NULL DEFAULT 'phase',
  restored_state jsonb NOT NULL DEFAULT '{}',
  rollback_reason jsonb NOT NULL DEFAULT '{}',
  rollback_mode text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_migration_rollbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_migration_rollbacks" ON public.architecture_migration_rollbacks FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_migration_rollbacks" ON public.architecture_migration_rollbacks FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_migration_rollback() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rollback_scope NOT IN ('phase','full') THEN RAISE EXCEPTION 'Invalid rollback_scope: %', NEW.rollback_scope; END IF;
  IF NEW.rollback_mode NOT IN ('manual','guardrail_auto','checkpoint_auto') THEN RAISE EXCEPTION 'Invalid rollback_mode: %', NEW.rollback_mode; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_migration_rollback BEFORE INSERT OR UPDATE ON public.architecture_migration_rollbacks FOR EACH ROW EXECUTE FUNCTION public.validate_migration_rollback();

-- 4. Migration Governance Profiles
CREATE TABLE public.architecture_migration_governance_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  profile_key text NOT NULL,
  profile_name text NOT NULL,
  profile_constraints jsonb NOT NULL DEFAULT '{}',
  max_scope_breadth numeric,
  required_checkpoint_depth text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, profile_key)
);

ALTER TABLE public.architecture_migration_governance_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_migration_gov" ON public.architecture_migration_governance_profiles FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_migration_gov" ON public.architecture_migration_governance_profiles FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_migration_gov" ON public.architecture_migration_governance_profiles FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_migration_governance_profile() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.required_checkpoint_depth NOT IN ('standard','elevated','strict') THEN RAISE EXCEPTION 'Invalid required_checkpoint_depth: %', NEW.required_checkpoint_depth; END IF;
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_migration_governance BEFORE INSERT OR UPDATE ON public.architecture_migration_governance_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_migration_governance_profile();

-- 5. Migration Reviews
CREATE TABLE public.architecture_migration_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  migration_execution_id uuid NOT NULL REFERENCES public.architecture_migration_executions(id),
  reviewer_ref jsonb,
  review_status text NOT NULL DEFAULT 'approved',
  review_notes text,
  review_reason_codes jsonb,
  linked_changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_migration_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_migration_reviews" ON public.architecture_migration_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_migration_reviews" ON public.architecture_migration_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_migration_review_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('approved','preparing','checkpoint_ready','executing','paused','completed','rolled_back','failed','archived') THEN RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_migration_review BEFORE INSERT OR UPDATE ON public.architecture_migration_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_migration_review_status();
