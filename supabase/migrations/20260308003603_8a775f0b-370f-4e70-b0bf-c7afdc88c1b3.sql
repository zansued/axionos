
-- Sprint 41: Architecture Rollout Pilot Governance

-- 1. Pilot Eligibility Rules
CREATE TABLE public.architecture_pilot_eligibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  rule_key text NOT NULL,
  rule_name text NOT NULL,
  rule_scope text NOT NULL DEFAULT 'global',
  rule_definition jsonb NOT NULL DEFAULT '{}',
  enforcement_mode text NOT NULL DEFAULT 'hard_block',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, rule_key)
);

ALTER TABLE public.architecture_pilot_eligibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pilot_eligibility" ON public.architecture_pilot_eligibility_rules FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pilot_eligibility" ON public.architecture_pilot_eligibility_rules FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_pilot_eligibility" ON public.architecture_pilot_eligibility_rules FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_pilot_eligibility_rule() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rule_scope NOT IN ('global','organization','workspace','context_class') THEN RAISE EXCEPTION 'Invalid rule_scope: %', NEW.rule_scope; END IF;
  IF NEW.enforcement_mode NOT IN ('hard_block','soft_warning') THEN RAISE EXCEPTION 'Invalid enforcement_mode: %', NEW.enforcement_mode; END IF;
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_pilot_eligibility BEFORE INSERT OR UPDATE ON public.architecture_pilot_eligibility_rules FOR EACH ROW EXECUTE FUNCTION public.validate_pilot_eligibility_rule();

-- 2. Rollout Pilots
CREATE TABLE public.architecture_rollout_pilots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  plan_id uuid NOT NULL REFERENCES public.architecture_change_plans(id),
  sandbox_outcome_id uuid REFERENCES public.architecture_rollout_sandbox_outcomes(id),
  pilot_name text NOT NULL,
  pilot_scope text NOT NULL,
  target_entities jsonb NOT NULL DEFAULT '{}',
  pilot_constraints jsonb NOT NULL DEFAULT '{}',
  pilot_mode text NOT NULL DEFAULT 'shadow',
  baseline_ref jsonb NOT NULL DEFAULT '{}',
  activation_window jsonb,
  rollback_triggers jsonb NOT NULL DEFAULT '[]',
  stop_conditions jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_rollout_pilots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pilots" ON public.architecture_rollout_pilots FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pilots" ON public.architecture_rollout_pilots FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_pilots" ON public.architecture_rollout_pilots FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_architecture_rollout_pilot() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.pilot_mode NOT IN ('shadow','traffic_slice','tenant_limited','feature_gated') THEN RAISE EXCEPTION 'Invalid pilot_mode: %', NEW.pilot_mode; END IF;
  IF NEW.status NOT IN ('draft','eligible','approved','active','paused','completed','rolled_back','rejected','archived') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_rollout_pilot BEFORE INSERT OR UPDATE ON public.architecture_rollout_pilots FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_rollout_pilot();

-- 3. Pilot Outcomes
CREATE TABLE public.architecture_rollout_pilot_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  pilot_id uuid NOT NULL REFERENCES public.architecture_rollout_pilots(id),
  baseline_summary jsonb NOT NULL DEFAULT '{}',
  pilot_summary jsonb NOT NULL DEFAULT '{}',
  delta_summary jsonb NOT NULL DEFAULT '{}',
  outcome_status text NOT NULL DEFAULT 'inconclusive',
  risk_flags jsonb,
  evidence_refs jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_rollout_pilot_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pilot_outcomes" ON public.architecture_rollout_pilot_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pilot_outcomes" ON public.architecture_rollout_pilot_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_pilot_outcome_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('helpful','neutral','harmful','inconclusive') THEN RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_pilot_outcome BEFORE INSERT OR UPDATE ON public.architecture_rollout_pilot_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_pilot_outcome_status();

-- 4. Pilot Rollbacks
CREATE TABLE public.architecture_rollout_pilot_rollbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  pilot_id uuid NOT NULL REFERENCES public.architecture_rollout_pilots(id),
  restored_state jsonb NOT NULL DEFAULT '{}',
  rollback_reason jsonb NOT NULL DEFAULT '{}',
  rollback_mode text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_rollout_pilot_rollbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pilot_rollbacks" ON public.architecture_rollout_pilot_rollbacks FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pilot_rollbacks" ON public.architecture_rollout_pilot_rollbacks FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_pilot_rollback_mode() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rollback_mode NOT IN ('manual','guardrail_auto') THEN RAISE EXCEPTION 'Invalid rollback_mode: %', NEW.rollback_mode; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_pilot_rollback BEFORE INSERT OR UPDATE ON public.architecture_rollout_pilot_rollbacks FOR EACH ROW EXECUTE FUNCTION public.validate_pilot_rollback_mode();

-- 5. Pilot Reviews
CREATE TABLE public.architecture_rollout_pilot_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  pilot_id uuid NOT NULL REFERENCES public.architecture_rollout_pilots(id),
  reviewer_ref jsonb,
  review_status text NOT NULL DEFAULT 'eligible',
  review_notes text,
  review_reason_codes jsonb,
  linked_changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_rollout_pilot_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pilot_reviews" ON public.architecture_rollout_pilot_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pilot_reviews" ON public.architecture_rollout_pilot_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_pilot_review_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('eligible','approved','paused','completed','rolled_back','rejected','archived') THEN RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_pilot_review BEFORE INSERT OR UPDATE ON public.architecture_rollout_pilot_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_pilot_review_status();
