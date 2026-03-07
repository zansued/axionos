
-- Sprint 21: Prompt Optimization Engine tables

-- 1. prompt_variants
CREATE TABLE public.prompt_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  stage_key text NOT NULL,
  agent_type text,
  model_provider text,
  model_name text,
  base_prompt_signature text NOT NULL,
  variant_name text NOT NULL,
  variant_version integer NOT NULL DEFAULT 1,
  prompt_template text NOT NULL,
  variables_schema jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','candidate','active_control','active_experiment','retired')),
  is_enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prompt_variants_org ON public.prompt_variants(organization_id);
CREATE INDEX idx_prompt_variants_stage ON public.prompt_variants(stage_key);
CREATE INDEX idx_prompt_variants_status ON public.prompt_variants(status);
CREATE INDEX idx_prompt_variants_base_sig ON public.prompt_variants(base_prompt_signature);

ALTER TABLE public.prompt_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view prompt variants"
  ON public.prompt_variants FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage prompt variants"
  ON public.prompt_variants FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

-- 2. prompt_variant_executions
CREATE TABLE public.prompt_variant_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  pipeline_job_id uuid REFERENCES public.initiative_jobs(id) ON DELETE SET NULL,
  stage_key text NOT NULL,
  prompt_variant_id uuid NOT NULL REFERENCES public.prompt_variants(id) ON DELETE CASCADE,
  model_provider text,
  model_name text,
  success boolean,
  retry_count integer NOT NULL DEFAULT 0,
  repair_triggered boolean NOT NULL DEFAULT false,
  cost_usd numeric NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  quality_score numeric,
  execution_signature text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pve_org ON public.prompt_variant_executions(organization_id);
CREATE INDEX idx_pve_variant ON public.prompt_variant_executions(prompt_variant_id);
CREATE INDEX idx_pve_stage ON public.prompt_variant_executions(stage_key);
CREATE INDEX idx_pve_created ON public.prompt_variant_executions(created_at);

ALTER TABLE public.prompt_variant_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view prompt variant executions"
  ON public.prompt_variant_executions FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage prompt variant executions"
  ON public.prompt_variant_executions FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

-- 3. prompt_variant_metrics
CREATE TABLE public.prompt_variant_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prompt_variant_id uuid NOT NULL REFERENCES public.prompt_variants(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  executions integer NOT NULL DEFAULT 0,
  success_rate numeric,
  repair_rate numeric,
  avg_cost_usd numeric,
  avg_duration_ms numeric,
  avg_quality_score numeric,
  promotion_score numeric,
  confidence_level numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pvm_org ON public.prompt_variant_metrics(organization_id);
CREATE INDEX idx_pvm_variant ON public.prompt_variant_metrics(prompt_variant_id);
CREATE INDEX idx_pvm_period ON public.prompt_variant_metrics(period_start, period_end);

ALTER TABLE public.prompt_variant_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view prompt variant metrics"
  ON public.prompt_variant_metrics FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage prompt variant metrics"
  ON public.prompt_variant_metrics FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

-- 4. prompt_variant_promotions
CREATE TABLE public.prompt_variant_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stage_key text NOT NULL,
  previous_control_variant_id uuid REFERENCES public.prompt_variants(id) ON DELETE SET NULL,
  promoted_variant_id uuid NOT NULL REFERENCES public.prompt_variants(id) ON DELETE CASCADE,
  promotion_reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  promotion_mode text NOT NULL DEFAULT 'manual' CHECK (promotion_mode IN ('manual','bounded_auto')),
  rollback_guard jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pvp_org ON public.prompt_variant_promotions(organization_id);
CREATE INDEX idx_pvp_stage ON public.prompt_variant_promotions(stage_key);

ALTER TABLE public.prompt_variant_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view prompt variant promotions"
  ON public.prompt_variant_promotions FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage prompt variant promotions"
  ON public.prompt_variant_promotions FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));
