
-- Sprint 25: Predictive Error Detection Operationalization

-- 1. Predictive Risk Assessments
CREATE TABLE public.predictive_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  initiative_id uuid NULL,
  pipeline_job_id uuid NULL,
  stage_key text NOT NULL,
  agent_type text NULL,
  model_provider text NULL,
  model_name text NULL,
  prompt_variant_id uuid NULL,
  context_signature text NOT NULL DEFAULT '',
  risk_score numeric NOT NULL DEFAULT 0,
  risk_band text NOT NULL DEFAULT 'low',
  confidence_score numeric NULL,
  predicted_failure_types jsonb NOT NULL DEFAULT '[]',
  explanation_codes jsonb NOT NULL DEFAULT '[]',
  evidence_refs jsonb NULL,
  recommended_actions jsonb NULL,
  applied_action_mode text NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Predictive Runtime Checkpoints
CREATE TABLE public.predictive_runtime_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_job_id uuid NOT NULL,
  stage_key text NOT NULL,
  checkpoint_type text NOT NULL DEFAULT 'pre_stage',
  risk_assessment_id uuid NOT NULL REFERENCES public.predictive_risk_assessments(id) ON DELETE CASCADE,
  checkpoint_decision text NOT NULL DEFAULT 'proceed',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Predictive Preventive Actions
CREATE TABLE public.predictive_preventive_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  risk_assessment_id uuid NOT NULL REFERENCES public.predictive_risk_assessments(id) ON DELETE CASCADE,
  stage_key text NOT NULL,
  action_type text NOT NULL DEFAULT 'human_review',
  action_mode text NOT NULL DEFAULT 'advisory_only',
  action_payload jsonb NULL,
  applied boolean NOT NULL DEFAULT false,
  outcome_status text NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_risk_assessment_band()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.risk_band NOT IN ('low', 'moderate', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid risk_band: %', NEW.risk_band;
  END IF;
  IF NEW.applied_action_mode IS NOT NULL AND NEW.applied_action_mode NOT IN ('none', 'advisory_only', 'bounded_auto_safe') THEN
    RAISE EXCEPTION 'Invalid applied_action_mode: %', NEW.applied_action_mode;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_risk_assessment
  BEFORE INSERT OR UPDATE ON public.predictive_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION public.validate_risk_assessment_band();

CREATE OR REPLACE FUNCTION public.validate_checkpoint_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.checkpoint_type NOT IN ('pre_stage', 'pre_expensive_stage', 'post_retry', 'pre_deploy_transition', 'pre_repair') THEN
    RAISE EXCEPTION 'Invalid checkpoint_type: %', NEW.checkpoint_type;
  END IF;
  IF NEW.checkpoint_decision NOT IN ('proceed', 'proceed_with_guard', 'recommend_review', 'pause_for_review') THEN
    RAISE EXCEPTION 'Invalid checkpoint_decision: %', NEW.checkpoint_decision;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_checkpoint
  BEFORE INSERT OR UPDATE ON public.predictive_runtime_checkpoints
  FOR EACH ROW EXECUTE FUNCTION public.validate_checkpoint_type();

CREATE OR REPLACE FUNCTION public.validate_preventive_action()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.action_type NOT IN ('strategy_fallback', 'prompt_fallback', 'extra_validation', 'extra_context', 'human_review', 'pause_execution') THEN
    RAISE EXCEPTION 'Invalid action_type: %', NEW.action_type;
  END IF;
  IF NEW.action_mode NOT IN ('advisory_only', 'bounded_auto_safe') THEN
    RAISE EXCEPTION 'Invalid action_mode: %', NEW.action_mode;
  END IF;
  IF NEW.outcome_status IS NOT NULL AND NEW.outcome_status NOT IN ('pending', 'helpful', 'neutral', 'harmful', 'unknown') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_preventive_action
  BEFORE INSERT OR UPDATE ON public.predictive_preventive_actions
  FOR EACH ROW EXECUTE FUNCTION public.validate_preventive_action();

-- Indexes
CREATE INDEX idx_risk_assessments_org ON public.predictive_risk_assessments(organization_id);
CREATE INDEX idx_risk_assessments_stage ON public.predictive_risk_assessments(organization_id, stage_key);
CREATE INDEX idx_risk_assessments_risk ON public.predictive_risk_assessments(organization_id, risk_band);
CREATE INDEX idx_checkpoints_org ON public.predictive_runtime_checkpoints(organization_id);
CREATE INDEX idx_checkpoints_job ON public.predictive_runtime_checkpoints(pipeline_job_id);
CREATE INDEX idx_preventive_actions_org ON public.predictive_preventive_actions(organization_id);
CREATE INDEX idx_preventive_actions_risk ON public.predictive_preventive_actions(risk_assessment_id);

-- RLS
ALTER TABLE public.predictive_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_runtime_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_preventive_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_risk_assessments" ON public.predictive_risk_assessments
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_risk_assessments" ON public.predictive_risk_assessments
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "service_role_all_risk_assessments" ON public.predictive_risk_assessments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "org_member_select_checkpoints" ON public.predictive_runtime_checkpoints
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_checkpoints" ON public.predictive_runtime_checkpoints
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "service_role_all_checkpoints" ON public.predictive_runtime_checkpoints
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "org_member_select_preventive_actions" ON public.predictive_preventive_actions
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_preventive_actions" ON public.predictive_preventive_actions
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_preventive_actions" ON public.predictive_preventive_actions
  FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "service_role_all_preventive_actions" ON public.predictive_preventive_actions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
