
-- Sprint 32: Execution Strategy Evolution tables

-- 1. Strategy Family Registry
CREATE TABLE public.execution_strategy_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  strategy_family_key text NOT NULL UNIQUE,
  strategy_family_name text NOT NULL,
  allowed_variant_scope text NOT NULL DEFAULT 'global',
  baseline_strategy_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  allowed_mutation_envelope jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluation_metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  rollout_mode text NOT NULL DEFAULT 'manual_only',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_strategy_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view strategy families" ON public.execution_strategy_families
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage strategy families" ON public.execution_strategy_families
  FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- 2. Strategy Variants
CREATE TABLE public.execution_strategy_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  strategy_family_id uuid NOT NULL REFERENCES public.execution_strategy_families(id),
  scope_ref jsonb,
  baseline_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  variant_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  mutation_delta jsonb NOT NULL DEFAULT '{}'::jsonb,
  hypothesis text NOT NULL DEFAULT '',
  expected_impact jsonb,
  confidence_score numeric,
  variant_mode text NOT NULL DEFAULT 'advisory_candidate',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_strategy_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view strategy variants" ON public.execution_strategy_variants
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage strategy variants" ON public.execution_strategy_variants
  FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- 3. Strategy Experiments
CREATE TABLE public.execution_strategy_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  strategy_variant_id uuid NOT NULL REFERENCES public.execution_strategy_variants(id),
  strategy_family_id uuid NOT NULL REFERENCES public.execution_strategy_families(id),
  scope_ref jsonb,
  baseline_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  variant_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  experiment_cap jsonb NOT NULL DEFAULT '{"max_executions": 50}'::jsonb,
  assignment_mode text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_strategy_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view strategy experiments" ON public.execution_strategy_experiments
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage strategy experiments" ON public.execution_strategy_experiments
  FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- 4. Strategy Outcomes
CREATE TABLE public.execution_strategy_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  experiment_id uuid NOT NULL REFERENCES public.execution_strategy_experiments(id),
  strategy_variant_id uuid NOT NULL REFERENCES public.execution_strategy_variants(id),
  pipeline_job_id uuid,
  applied_mode text NOT NULL DEFAULT 'baseline',
  outcome_status text NOT NULL DEFAULT 'inconclusive',
  outcome_metrics jsonb,
  evidence_refs jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_strategy_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view strategy outcomes" ON public.execution_strategy_outcomes
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage strategy outcomes" ON public.execution_strategy_outcomes
  FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_strategy_family()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.allowed_variant_scope NOT IN ('global', 'organization', 'workspace', 'context_class') THEN
    RAISE EXCEPTION 'Invalid allowed_variant_scope: %', NEW.allowed_variant_scope;
  END IF;
  IF NEW.rollout_mode NOT IN ('manual_only', 'bounded_experiment') THEN
    RAISE EXCEPTION 'Invalid rollout_mode: %', NEW.rollout_mode;
  END IF;
  IF NEW.status NOT IN ('active', 'watch', 'frozen', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid strategy family status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_strategy_family
  BEFORE INSERT OR UPDATE ON public.execution_strategy_families
  FOR EACH ROW EXECUTE FUNCTION public.validate_strategy_family();

CREATE OR REPLACE FUNCTION public.validate_strategy_variant()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.variant_mode NOT IN ('advisory_candidate', 'bounded_experiment_candidate') THEN
    RAISE EXCEPTION 'Invalid variant_mode: %', NEW.variant_mode;
  END IF;
  IF NEW.status NOT IN ('draft', 'reviewed', 'approved', 'rejected', 'active_experiment', 'rolled_back', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid strategy variant status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_strategy_variant
  BEFORE INSERT OR UPDATE ON public.execution_strategy_variants
  FOR EACH ROW EXECUTE FUNCTION public.validate_strategy_variant();

CREATE OR REPLACE FUNCTION public.validate_strategy_experiment()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.assignment_mode NOT IN ('manual', 'bounded_experiment') THEN
    RAISE EXCEPTION 'Invalid assignment_mode: %', NEW.assignment_mode;
  END IF;
  IF NEW.status NOT IN ('draft', 'active', 'paused', 'completed', 'rolled_back') THEN
    RAISE EXCEPTION 'Invalid strategy experiment status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_strategy_experiment
  BEFORE INSERT OR UPDATE ON public.execution_strategy_experiments
  FOR EACH ROW EXECUTE FUNCTION public.validate_strategy_experiment();

CREATE OR REPLACE FUNCTION public.validate_strategy_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.applied_mode NOT IN ('baseline', 'variant') THEN
    RAISE EXCEPTION 'Invalid applied_mode: %', NEW.applied_mode;
  END IF;
  IF NEW.outcome_status NOT IN ('helpful', 'neutral', 'harmful', 'inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_strategy_outcome
  BEFORE INSERT OR UPDATE ON public.execution_strategy_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_strategy_outcome();

-- Indexes
CREATE INDEX idx_strategy_families_org ON public.execution_strategy_families(organization_id);
CREATE INDEX idx_strategy_families_status ON public.execution_strategy_families(status);
CREATE INDEX idx_strategy_variants_family ON public.execution_strategy_variants(strategy_family_id);
CREATE INDEX idx_strategy_variants_status ON public.execution_strategy_variants(status);
CREATE INDEX idx_strategy_variants_org ON public.execution_strategy_variants(organization_id);
CREATE INDEX idx_strategy_experiments_variant ON public.execution_strategy_experiments(strategy_variant_id);
CREATE INDEX idx_strategy_experiments_status ON public.execution_strategy_experiments(status);
CREATE INDEX idx_strategy_experiments_org ON public.execution_strategy_experiments(organization_id);
CREATE INDEX idx_strategy_outcomes_experiment ON public.execution_strategy_outcomes(experiment_id);
CREATE INDEX idx_strategy_outcomes_variant ON public.execution_strategy_outcomes(strategy_variant_id);
CREATE INDEX idx_strategy_outcomes_org ON public.execution_strategy_outcomes(organization_id);
