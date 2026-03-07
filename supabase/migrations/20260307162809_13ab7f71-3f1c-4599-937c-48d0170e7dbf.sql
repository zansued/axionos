
-- Sprint 26: Cross-Stage Learning Tables

-- 1. cross_stage_learning_edges
CREATE TABLE public.cross_stage_learning_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  from_stage_key text NOT NULL,
  to_stage_key text NOT NULL,
  relationship_type text NOT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  support_count integer NOT NULL DEFAULT 0,
  confidence_score numeric NOT NULL DEFAULT 0,
  impact_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cross_stage_edges_org ON public.cross_stage_learning_edges(organization_id);
CREATE INDEX idx_cross_stage_edges_from ON public.cross_stage_learning_edges(from_stage_key);
CREATE INDEX idx_cross_stage_edges_to ON public.cross_stage_learning_edges(to_stage_key);
CREATE INDEX idx_cross_stage_edges_status ON public.cross_stage_learning_edges(status);

ALTER TABLE public.cross_stage_learning_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org edges" ON public.cross_stage_learning_edges
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role full access edges" ON public.cross_stage_learning_edges
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. cross_stage_policy_profiles
CREATE TABLE public.cross_stage_policy_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  policy_type text NOT NULL,
  policy_scope text NOT NULL DEFAULT 'stage_pair',
  affected_stages text[] NOT NULL DEFAULT '{}',
  trigger_signature text NOT NULL DEFAULT '',
  policy_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric NOT NULL DEFAULT 0,
  support_count integer NOT NULL DEFAULT 0,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  action_mode text NOT NULL DEFAULT 'advisory_only',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cross_stage_policies_org ON public.cross_stage_policy_profiles(organization_id);
CREATE INDEX idx_cross_stage_policies_status ON public.cross_stage_policy_profiles(status);
CREATE INDEX idx_cross_stage_policies_type ON public.cross_stage_policy_profiles(policy_type);

ALTER TABLE public.cross_stage_policy_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org policies" ON public.cross_stage_policy_profiles
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role full access policies" ON public.cross_stage_policy_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. cross_stage_policy_outcomes
CREATE TABLE public.cross_stage_policy_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  policy_id uuid NOT NULL REFERENCES public.cross_stage_policy_profiles(id),
  pipeline_job_id uuid NULL,
  observed_outcome text NOT NULL DEFAULT 'pending',
  baseline_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  policy_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  downstream_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  spillover_detected boolean NOT NULL DEFAULT false,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cross_stage_outcomes_org ON public.cross_stage_policy_outcomes(organization_id);
CREATE INDEX idx_cross_stage_outcomes_policy ON public.cross_stage_policy_outcomes(policy_id);

ALTER TABLE public.cross_stage_policy_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org outcomes" ON public.cross_stage_policy_outcomes
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role full access outcomes" ON public.cross_stage_policy_outcomes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_cross_stage_edge()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.relationship_type NOT IN ('failure_propagation', 'success_dependency', 'retry_correlation', 'cost_amplification', 'validation_cascade', 'repair_influence') THEN
    RAISE EXCEPTION 'Invalid relationship_type: %', NEW.relationship_type;
  END IF;
  IF NEW.status NOT IN ('active', 'watch', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid cross_stage_learning_edges status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cross_stage_edge
  BEFORE INSERT OR UPDATE ON public.cross_stage_learning_edges
  FOR EACH ROW EXECUTE FUNCTION public.validate_cross_stage_edge();

CREATE OR REPLACE FUNCTION public.validate_cross_stage_policy()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.policy_type NOT IN ('prompt_coordination', 'strategy_coordination', 'validation_guard', 'repair_preemption', 'context_enrichment', 'review_escalation') THEN
    RAISE EXCEPTION 'Invalid policy_type: %', NEW.policy_type;
  END IF;
  IF NEW.policy_scope NOT IN ('stage_pair', 'stage_group', 'pipeline_wide') THEN
    RAISE EXCEPTION 'Invalid policy_scope: %', NEW.policy_scope;
  END IF;
  IF NEW.status NOT IN ('draft', 'active', 'watch', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid cross_stage_policy_profiles status: %', NEW.status;
  END IF;
  IF NEW.action_mode NOT IN ('advisory_only', 'bounded_auto_safe') THEN
    RAISE EXCEPTION 'Invalid action_mode: %', NEW.action_mode;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cross_stage_policy
  BEFORE INSERT OR UPDATE ON public.cross_stage_policy_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_cross_stage_policy();

CREATE OR REPLACE FUNCTION public.validate_cross_stage_outcome()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.observed_outcome NOT IN ('pending', 'helpful', 'neutral', 'harmful', 'inconclusive') THEN
    RAISE EXCEPTION 'Invalid observed_outcome: %', NEW.observed_outcome;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cross_stage_outcome
  BEFORE INSERT OR UPDATE ON public.cross_stage_policy_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_cross_stage_outcome();
