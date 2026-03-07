
-- Sprint 29: Workspace / Tenant Adaptive Policy Tuning

-- 1. Tenant Policy Preference Profiles
CREATE TABLE public.tenant_policy_preference_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid NULL REFERENCES public.workspaces(id),
  preference_scope text NOT NULL,
  preference_name text NOT NULL,
  preferred_policy_modes jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  override_limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric NULL,
  support_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_pref_profiles_org ON public.tenant_policy_preference_profiles(organization_id);
CREATE INDEX idx_tenant_pref_profiles_ws ON public.tenant_policy_preference_profiles(workspace_id);
CREATE INDEX idx_tenant_pref_profiles_status ON public.tenant_policy_preference_profiles(status);

ALTER TABLE public.tenant_policy_preference_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_pref_profiles_org_isolation" ON public.tenant_policy_preference_profiles
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "tenant_pref_profiles_service" ON public.tenant_policy_preference_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Validation trigger for preference profiles
CREATE OR REPLACE FUNCTION public.validate_tenant_pref_profile()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.preference_scope NOT IN ('organization', 'workspace') THEN
    RAISE EXCEPTION 'Invalid preference_scope: %', NEW.preference_scope;
  END IF;
  IF NEW.status NOT IN ('draft', 'active', 'watch', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid tenant_policy_preference_profiles status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_tenant_pref_profile
  BEFORE INSERT OR UPDATE ON public.tenant_policy_preference_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_pref_profile();

-- 2. Tenant Policy Outcomes
CREATE TABLE public.tenant_policy_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid NULL REFERENCES public.workspaces(id),
  execution_policy_profile_id uuid NOT NULL REFERENCES public.execution_policy_profiles(id),
  tenant_preference_profile_id uuid NULL REFERENCES public.tenant_policy_preference_profiles(id),
  pipeline_job_id uuid NULL,
  context_class text NOT NULL,
  applied_mode text NOT NULL,
  outcome_status text NOT NULL,
  outcome_metrics jsonb NULL,
  evidence_refs jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_outcomes_org ON public.tenant_policy_outcomes(organization_id);
CREATE INDEX idx_tenant_outcomes_ws ON public.tenant_policy_outcomes(workspace_id);
CREATE INDEX idx_tenant_outcomes_policy ON public.tenant_policy_outcomes(execution_policy_profile_id);
CREATE INDEX idx_tenant_outcomes_status ON public.tenant_policy_outcomes(outcome_status);

ALTER TABLE public.tenant_policy_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_outcomes_org_isolation" ON public.tenant_policy_outcomes
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "tenant_outcomes_service" ON public.tenant_policy_outcomes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Validation trigger for tenant outcomes
CREATE OR REPLACE FUNCTION public.validate_tenant_policy_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.applied_mode NOT IN ('global_default', 'tenant_tuned', 'workspace_tuned') THEN
    RAISE EXCEPTION 'Invalid applied_mode: %', NEW.applied_mode;
  END IF;
  IF NEW.outcome_status NOT IN ('helpful', 'neutral', 'harmful', 'inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_tenant_policy_outcome
  BEFORE INSERT OR UPDATE ON public.tenant_policy_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_policy_outcome();

-- 3. Tenant Policy Recommendations
CREATE TABLE public.tenant_policy_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid NULL REFERENCES public.workspaces(id),
  recommendation_type text NOT NULL,
  target_profile_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation_reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_recs_org ON public.tenant_policy_recommendations(organization_id);
CREATE INDEX idx_tenant_recs_status ON public.tenant_policy_recommendations(status);

ALTER TABLE public.tenant_policy_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_recs_org_isolation" ON public.tenant_policy_recommendations
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "tenant_recs_service" ON public.tenant_policy_recommendations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Validation trigger for tenant recommendations
CREATE OR REPLACE FUNCTION public.validate_tenant_policy_recommendation()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.recommendation_type NOT IN ('activate', 'reprioritize', 'tighten_limits', 'loosen_limits', 'rollback_to_default', 'deprecate', 'split_scope') THEN
    RAISE EXCEPTION 'Invalid recommendation_type: %', NEW.recommendation_type;
  END IF;
  IF NEW.status NOT IN ('open', 'reviewed', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid recommendation status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_tenant_policy_recommendation
  BEFORE INSERT OR UPDATE ON public.tenant_policy_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_policy_recommendation();
