
-- Sprint 68: One-Click Delivery & Deploy Assurance Layer
-- 6 tables with full RLS by organization_id

-- 1. delivery_orchestration_models
CREATE TABLE public.delivery_orchestration_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  delivery_model_name text NOT NULL DEFAULT 'one_click_default',
  release_path_definition jsonb NOT NULL DEFAULT '{}',
  gate_requirements jsonb NOT NULL DEFAULT '[]',
  rollback_policy jsonb NOT NULL DEFAULT '{}',
  assurance_thresholds jsonb NOT NULL DEFAULT '{}',
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]',
  assumptions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_orchestration_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_orchestration_models_select" ON public.delivery_orchestration_models FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "delivery_orchestration_models_insert" ON public.delivery_orchestration_models FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "delivery_orchestration_models_update" ON public.delivery_orchestration_models FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. delivery_orchestration_instances
CREATE TABLE public.delivery_orchestration_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE CASCADE,
  delivery_model_name text NOT NULL DEFAULT 'one_click_default',
  current_delivery_state text NOT NULL DEFAULT 'not_started',
  deploy_readiness_score numeric NOT NULL DEFAULT 0,
  deploy_confidence_score numeric NOT NULL DEFAULT 0,
  validation_gate_score numeric NOT NULL DEFAULT 0,
  blocker_score numeric NOT NULL DEFAULT 0,
  rollback_readiness_score numeric NOT NULL DEFAULT 0,
  delivery_visibility_score numeric NOT NULL DEFAULT 0,
  output_accessibility_score numeric NOT NULL DEFAULT 0,
  handoff_completeness_score numeric NOT NULL DEFAULT 0,
  deploy_url text DEFAULT NULL,
  preview_url text DEFAULT NULL,
  repo_url text DEFAULT NULL,
  delivery_recommendation_status text NOT NULL DEFAULT 'pending',
  evidence_links jsonb NOT NULL DEFAULT '[]',
  assumptions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_orchestration_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_orchestration_instances_select" ON public.delivery_orchestration_instances FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "delivery_orchestration_instances_insert" ON public.delivery_orchestration_instances FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "delivery_orchestration_instances_update" ON public.delivery_orchestration_instances FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. deploy_assurance_assessments
CREATE TABLE public.deploy_assurance_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE CASCADE,
  deploy_readiness_score numeric NOT NULL DEFAULT 0,
  deploy_confidence_score numeric NOT NULL DEFAULT 0,
  validation_gate_score numeric NOT NULL DEFAULT 0,
  blocker_count integer NOT NULL DEFAULT 0,
  blocker_details jsonb NOT NULL DEFAULT '[]',
  rollback_readiness_score numeric NOT NULL DEFAULT 0,
  recovery_readiness_score numeric NOT NULL DEFAULT 0,
  one_click_friction_score numeric NOT NULL DEFAULT 0,
  deploy_success_clarity_score numeric NOT NULL DEFAULT 0,
  delivery_assurance_quality_score numeric NOT NULL DEFAULT 0,
  final_mile_coherence_score numeric NOT NULL DEFAULT 0,
  assessment_status text NOT NULL DEFAULT 'pending',
  evidence_links jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deploy_assurance_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deploy_assurance_assessments_select" ON public.deploy_assurance_assessments FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "deploy_assurance_assessments_insert" ON public.deploy_assurance_assessments FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "deploy_assurance_assessments_update" ON public.deploy_assurance_assessments FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 4. delivery_output_views
CREATE TABLE public.delivery_output_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE CASCADE,
  deploy_url text DEFAULT NULL,
  preview_url text DEFAULT NULL,
  repo_url text DEFAULT NULL,
  delivery_timestamp timestamptz DEFAULT NULL,
  handoff_status text NOT NULL DEFAULT 'pending',
  output_accessibility_score numeric NOT NULL DEFAULT 0,
  handoff_completeness_score numeric NOT NULL DEFAULT 0,
  delivery_visibility_score numeric NOT NULL DEFAULT 0,
  output_details jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_output_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_output_views_select" ON public.delivery_output_views FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "delivery_output_views_insert" ON public.delivery_output_views FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "delivery_output_views_update" ON public.delivery_output_views FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 5. deploy_recovery_states
CREATE TABLE public.deploy_recovery_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE CASCADE,
  recovery_state text NOT NULL DEFAULT 'none',
  rollback_available boolean NOT NULL DEFAULT false,
  rollback_target jsonb NOT NULL DEFAULT '{}',
  degraded_delivery_visible boolean NOT NULL DEFAULT false,
  degraded_delivery_details jsonb NOT NULL DEFAULT '{}',
  recovery_readiness_score numeric NOT NULL DEFAULT 0,
  degraded_delivery_visibility_score numeric NOT NULL DEFAULT 0,
  recovery_action_label text DEFAULT NULL,
  evidence_links jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deploy_recovery_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deploy_recovery_states_select" ON public.deploy_recovery_states FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "deploy_recovery_states_insert" ON public.deploy_recovery_states FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "deploy_recovery_states_update" ON public.deploy_recovery_states FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 6. delivery_assurance_outcomes
CREATE TABLE public.delivery_assurance_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE CASCADE,
  outcome_domain text NOT NULL DEFAULT 'delivery',
  expected_outcomes jsonb NOT NULL DEFAULT '{}',
  realized_outcomes jsonb NOT NULL DEFAULT '{}',
  deploy_readiness_score numeric NOT NULL DEFAULT 0,
  deploy_confidence_score numeric NOT NULL DEFAULT 0,
  delivery_assurance_quality_score numeric NOT NULL DEFAULT 0,
  delivery_outcome_accuracy_score numeric NOT NULL DEFAULT 0.5,
  final_mile_coherence_score numeric NOT NULL DEFAULT 0,
  one_click_friction_score numeric NOT NULL DEFAULT 0,
  rollback_readiness_score numeric NOT NULL DEFAULT 0,
  recovery_readiness_score numeric NOT NULL DEFAULT 0,
  delivery_visibility_score numeric NOT NULL DEFAULT 0,
  output_accessibility_score numeric NOT NULL DEFAULT 0,
  handoff_completeness_score numeric NOT NULL DEFAULT 0,
  deploy_success_clarity_score numeric NOT NULL DEFAULT 0,
  degraded_delivery_visibility_score numeric NOT NULL DEFAULT 0,
  evidence_links jsonb NOT NULL DEFAULT '[]',
  assumptions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_assurance_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_assurance_outcomes_select" ON public.delivery_assurance_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "delivery_assurance_outcomes_insert" ON public.delivery_assurance_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "delivery_assurance_outcomes_update" ON public.delivery_assurance_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_delivery_orchestration_model_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_delivery_orchestration_model BEFORE INSERT OR UPDATE ON public.delivery_orchestration_models FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_orchestration_model_status();

CREATE OR REPLACE FUNCTION public.validate_delivery_instance_state()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.current_delivery_state NOT IN ('not_started','assessing','ready','blocked','deploying','deployed','partial','failed','rolled_back','recovered') THEN RAISE EXCEPTION 'Invalid current_delivery_state: %', NEW.current_delivery_state; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_delivery_instance BEFORE INSERT OR UPDATE ON public.delivery_orchestration_instances FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_instance_state();

CREATE OR REPLACE FUNCTION public.validate_deploy_assurance_assessment()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.assessment_status NOT IN ('pending','assessed','passed','blocked','failed') THEN RAISE EXCEPTION 'Invalid assessment_status: %', NEW.assessment_status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_deploy_assurance BEFORE INSERT OR UPDATE ON public.deploy_assurance_assessments FOR EACH ROW EXECUTE FUNCTION public.validate_deploy_assurance_assessment();

CREATE OR REPLACE FUNCTION public.validate_delivery_output_view()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.handoff_status NOT IN ('pending','partial','complete','failed') THEN RAISE EXCEPTION 'Invalid handoff_status: %', NEW.handoff_status; END IF;
  IF NEW.status NOT IN ('active','archived') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_delivery_output BEFORE INSERT OR UPDATE ON public.delivery_output_views FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_output_view();

CREATE OR REPLACE FUNCTION public.validate_deploy_recovery_state()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.recovery_state NOT IN ('none','rollback_available','rolling_back','rolled_back','degraded','recovered','failed') THEN RAISE EXCEPTION 'Invalid recovery_state: %', NEW.recovery_state; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_deploy_recovery BEFORE INSERT OR UPDATE ON public.deploy_recovery_states FOR EACH ROW EXECUTE FUNCTION public.validate_deploy_recovery_state();
