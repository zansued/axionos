
-- Sprint 27: Execution Policy Intelligence

-- 1. Execution Policy Profiles
CREATE TABLE public.execution_policy_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  policy_name text NOT NULL,
  policy_mode text NOT NULL,
  policy_scope text NOT NULL,
  allowed_adjustments jsonb NOT NULL DEFAULT '{}',
  default_priority numeric,
  confidence_score numeric,
  support_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_execution_policy_profiles_org ON public.execution_policy_profiles(organization_id);
CREATE INDEX idx_execution_policy_profiles_status ON public.execution_policy_profiles(status);
CREATE INDEX idx_execution_policy_profiles_mode ON public.execution_policy_profiles(policy_mode);

ALTER TABLE public.execution_policy_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org execution_policy_profiles"
  ON public.execution_policy_profiles FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert own org execution_policy_profiles"
  ON public.execution_policy_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update own org execution_policy_profiles"
  ON public.execution_policy_profiles FOR UPDATE
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role full access execution_policy_profiles"
  ON public.execution_policy_profiles FOR ALL
  TO service_role
  USING (true);

-- Validation trigger for execution_policy_profiles
CREATE OR REPLACE FUNCTION public.validate_execution_policy_profile()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.policy_scope NOT IN ('global', 'initiative_type', 'workspace', 'execution_context') THEN
    RAISE EXCEPTION 'Invalid policy_scope: %', NEW.policy_scope;
  END IF;
  IF NEW.status NOT IN ('draft', 'active', 'watch', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid execution_policy_profiles status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_execution_policy_profile
  BEFORE INSERT OR UPDATE ON public.execution_policy_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_execution_policy_profile();

-- updated_at trigger
CREATE TRIGGER trg_execution_policy_profiles_updated
  BEFORE UPDATE ON public.execution_policy_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Execution Policy Outcomes
CREATE TABLE public.execution_policy_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  execution_policy_profile_id uuid NOT NULL REFERENCES public.execution_policy_profiles(id),
  pipeline_job_id uuid,
  applied_mode text NOT NULL,
  context_class text NOT NULL,
  outcome_status text NOT NULL DEFAULT 'inconclusive',
  outcome_metrics jsonb,
  evidence_refs jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_execution_policy_outcomes_org ON public.execution_policy_outcomes(organization_id);
CREATE INDEX idx_execution_policy_outcomes_profile ON public.execution_policy_outcomes(execution_policy_profile_id);
CREATE INDEX idx_execution_policy_outcomes_status ON public.execution_policy_outcomes(outcome_status);

ALTER TABLE public.execution_policy_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org execution_policy_outcomes"
  ON public.execution_policy_outcomes FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert own org execution_policy_outcomes"
  ON public.execution_policy_outcomes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role full access execution_policy_outcomes"
  ON public.execution_policy_outcomes FOR ALL
  TO service_role
  USING (true);

-- Validation trigger for execution_policy_outcomes
CREATE OR REPLACE FUNCTION public.validate_execution_policy_outcome()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.applied_mode NOT IN ('advisory_only', 'bounded_auto_safe', 'none') THEN
    RAISE EXCEPTION 'Invalid applied_mode: %', NEW.applied_mode;
  END IF;
  IF NEW.outcome_status NOT IN ('helpful', 'neutral', 'harmful', 'inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_execution_policy_outcome
  BEFORE INSERT OR UPDATE ON public.execution_policy_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_execution_policy_outcome();

-- 3. Execution Policy Decisions (audit trail)
CREATE TABLE public.execution_policy_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  execution_policy_profile_id uuid NOT NULL REFERENCES public.execution_policy_profiles(id),
  pipeline_job_id uuid,
  context_class text NOT NULL,
  applied_mode text NOT NULL,
  adjustments_applied jsonb NOT NULL DEFAULT '{}',
  reason_codes text[] NOT NULL DEFAULT '{}',
  evidence_refs jsonb,
  checkpoint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_execution_policy_decisions_org ON public.execution_policy_decisions(organization_id);
CREATE INDEX idx_execution_policy_decisions_profile ON public.execution_policy_decisions(execution_policy_profile_id);

ALTER TABLE public.execution_policy_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org execution_policy_decisions"
  ON public.execution_policy_decisions FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert own org execution_policy_decisions"
  ON public.execution_policy_decisions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role full access execution_policy_decisions"
  ON public.execution_policy_decisions FOR ALL
  TO service_role
  USING (true);
