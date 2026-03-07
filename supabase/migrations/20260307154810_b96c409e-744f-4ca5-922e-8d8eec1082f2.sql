
-- Sprint 23: Self-Improving Fix Agents v2 — Repair Policy Tables

-- 1. Repair Policy Profiles
CREATE TABLE public.repair_policy_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stage_key text NOT NULL,
  error_signature text NOT NULL,
  agent_type text,
  model_provider text,
  model_name text,
  preferred_strategy text NOT NULL,
  fallback_strategy text,
  confidence numeric DEFAULT 0,
  support_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  avg_retry_count numeric DEFAULT 0,
  avg_repair_cost_usd numeric DEFAULT 0,
  avg_resolution_time_ms numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_policy_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_repair_policy_profiles_org ON public.repair_policy_profiles(organization_id);
CREATE INDEX idx_repair_policy_profiles_stage_sig ON public.repair_policy_profiles(organization_id, stage_key, error_signature);

CREATE POLICY "Users can view own org repair policies"
  ON public.repair_policy_profiles FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role full access repair policies"
  ON public.repair_policy_profiles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_repair_policy_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'watch', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid repair_policy_profiles status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_repair_policy_status
  BEFORE INSERT OR UPDATE ON public.repair_policy_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_repair_policy_status();

-- 2. Repair Policy Decisions
CREATE TABLE public.repair_policy_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_job_id uuid,
  stage_key text NOT NULL,
  error_signature text NOT NULL,
  selected_strategy text NOT NULL,
  fallback_strategy text,
  confidence numeric DEFAULT 0,
  reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  outcome_status text NOT NULL DEFAULT 'pending',
  retry_count integer DEFAULT 0,
  cost_usd numeric DEFAULT 0,
  duration_ms integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_policy_decisions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_repair_policy_decisions_org ON public.repair_policy_decisions(organization_id);
CREATE INDEX idx_repair_policy_decisions_stage ON public.repair_policy_decisions(organization_id, stage_key);
CREATE INDEX idx_repair_policy_decisions_created ON public.repair_policy_decisions(created_at DESC);

CREATE POLICY "Users can view own org repair decisions"
  ON public.repair_policy_decisions FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role full access repair decisions"
  ON public.repair_policy_decisions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Validation trigger for outcome_status
CREATE OR REPLACE FUNCTION public.validate_repair_decision_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending', 'resolved', 'failed', 'escalated') THEN
    RAISE EXCEPTION 'Invalid repair_policy_decisions outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_repair_decision_status
  BEFORE INSERT OR UPDATE ON public.repair_policy_decisions
  FOR EACH ROW EXECUTE FUNCTION public.validate_repair_decision_status();

-- 3. Repair Policy Adjustments
CREATE TABLE public.repair_policy_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  repair_policy_profile_id uuid NOT NULL REFERENCES public.repair_policy_profiles(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL,
  adjustment_reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  bounded_delta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_policy_adjustments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_repair_policy_adjustments_org ON public.repair_policy_adjustments(organization_id);
CREATE INDEX idx_repair_policy_adjustments_profile ON public.repair_policy_adjustments(repair_policy_profile_id);

CREATE POLICY "Users can view own org repair adjustments"
  ON public.repair_policy_adjustments FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role full access repair adjustments"
  ON public.repair_policy_adjustments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Validation trigger for adjustment_type
CREATE OR REPLACE FUNCTION public.validate_repair_adjustment_type()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.adjustment_type NOT IN ('promote_strategy', 'demote_strategy', 'fallback_change', 'watch_flag', 'deprecate_policy') THEN
    RAISE EXCEPTION 'Invalid repair_policy_adjustments adjustment_type: %', NEW.adjustment_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_repair_adjustment_type
  BEFORE INSERT OR UPDATE ON public.repair_policy_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.validate_repair_adjustment_type();
