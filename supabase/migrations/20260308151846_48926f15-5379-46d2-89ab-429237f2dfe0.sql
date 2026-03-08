
-- Sprint 66: User Journey Orchestration Layer

-- 1. user_journey_models
CREATE TABLE public.user_journey_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  journey_model_name text NOT NULL DEFAULT '',
  journey_model_version text NOT NULL DEFAULT 'v1',
  stage_definitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  transition_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_gate_definitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  artifact_visibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_journey_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_journey_models" ON public.user_journey_models FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_journey_models" ON public.user_journey_models FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_journey_models" ON public.user_journey_models FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. user_journey_instances
CREATE TABLE public.user_journey_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  initiative_id uuid REFERENCES public.initiatives(id),
  journey_model_id uuid REFERENCES public.user_journey_models(id),
  current_visible_stage text NOT NULL DEFAULT 'idea',
  current_internal_stage text NOT NULL DEFAULT 'draft',
  journey_progress_score numeric NOT NULL DEFAULT 0,
  clarity_score numeric NOT NULL DEFAULT 0,
  next_action_type text NOT NULL DEFAULT 'none',
  next_action_label text NOT NULL DEFAULT '',
  approval_required boolean NOT NULL DEFAULT false,
  approval_state text NOT NULL DEFAULT 'none',
  approval_actor_type text NOT NULL DEFAULT 'user',
  visible_artifact_count integer NOT NULL DEFAULT 0,
  deployment_visibility_score numeric NOT NULL DEFAULT 0,
  handoff_readiness_score numeric NOT NULL DEFAULT 0,
  orchestration_health_score numeric NOT NULL DEFAULT 0,
  journey_friction_score numeric NOT NULL DEFAULT 0,
  recommendation_status text NOT NULL DEFAULT 'none',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  expected_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_journey_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_journey_instances" ON public.user_journey_instances FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_journey_instances" ON public.user_journey_instances FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_journey_instances" ON public.user_journey_instances FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. user_journey_transitions
CREATE TABLE public.user_journey_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  journey_instance_id uuid NOT NULL REFERENCES public.user_journey_instances(id),
  from_visible_stage text NOT NULL DEFAULT '',
  to_visible_stage text NOT NULL DEFAULT '',
  from_internal_stage text NOT NULL DEFAULT '',
  to_internal_stage text NOT NULL DEFAULT '',
  trigger_type text NOT NULL DEFAULT 'automatic',
  trigger_label text NOT NULL DEFAULT '',
  approval_required boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'none',
  transition_health_score numeric NOT NULL DEFAULT 0,
  blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_journey_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_journey_transitions" ON public.user_journey_transitions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_journey_transitions" ON public.user_journey_transitions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. user_journey_artifact_views
CREATE TABLE public.user_journey_artifact_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  journey_instance_id uuid NOT NULL REFERENCES public.user_journey_instances(id),
  visible_stage text NOT NULL DEFAULT '',
  artifact_type text NOT NULL DEFAULT '',
  artifact_label text NOT NULL DEFAULT '',
  artifact_summary text,
  artifact_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility_priority integer NOT NULL DEFAULT 0,
  surfaced boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_journey_artifact_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_journey_artifacts" ON public.user_journey_artifact_views FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_journey_artifacts" ON public.user_journey_artifact_views FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 5. user_journey_approval_states
CREATE TABLE public.user_journey_approval_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  journey_instance_id uuid NOT NULL REFERENCES public.user_journey_instances(id),
  visible_stage text NOT NULL DEFAULT '',
  approval_type text NOT NULL DEFAULT 'stage_gate',
  approval_label text NOT NULL DEFAULT '',
  approval_description text,
  required_actor_type text NOT NULL DEFAULT 'user',
  approval_status text NOT NULL DEFAULT 'pending',
  resolved_at timestamptz,
  resolved_by text,
  resolution_note text,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_journey_approval_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_journey_approvals" ON public.user_journey_approval_states FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_journey_approvals" ON public.user_journey_approval_states FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_journey_approvals" ON public.user_journey_approval_states FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 6. user_journey_outcomes
CREATE TABLE public.user_journey_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  journey_instance_id uuid NOT NULL REFERENCES public.user_journey_instances(id),
  outcome_domain text NOT NULL DEFAULT 'journey_orchestration',
  outcome_scope_type text NOT NULL DEFAULT 'initiative',
  outcome_scope_id text,
  journey_progress_score numeric NOT NULL DEFAULT 0,
  journey_clarity_score numeric NOT NULL DEFAULT 0,
  next_step_confidence_score numeric NOT NULL DEFAULT 0,
  approval_clarity_score numeric NOT NULL DEFAULT 0,
  visible_artifact_coverage_score numeric NOT NULL DEFAULT 0,
  deployment_visibility_score numeric NOT NULL DEFAULT 0,
  orchestration_health_score numeric NOT NULL DEFAULT 0,
  journey_friction_score numeric NOT NULL DEFAULT 0,
  blocked_transition_score numeric NOT NULL DEFAULT 0,
  resume_readiness_score numeric NOT NULL DEFAULT 0,
  handoff_readiness_score numeric NOT NULL DEFAULT 0,
  journey_outcome_accuracy_score numeric NOT NULL DEFAULT 0,
  user_visible_coherence_score numeric NOT NULL DEFAULT 0,
  internal_complexity_leakage_score numeric NOT NULL DEFAULT 0,
  recommendation_status text NOT NULL DEFAULT 'none',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  expected_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_journey_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_journey_outcomes" ON public.user_journey_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_journey_outcomes" ON public.user_journey_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_journey_outcomes" ON public.user_journey_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_journey_instance_stage()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.current_visible_stage NOT IN ('idea','discovery','architecture','engineering','validation','deploy','delivered') THEN
    RAISE EXCEPTION 'Invalid current_visible_stage: %', NEW.current_visible_stage;
  END IF;
  IF NEW.approval_state NOT IN ('none','pending','approved','rejected','skipped') THEN
    RAISE EXCEPTION 'Invalid approval_state: %', NEW.approval_state;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_journey_instance
  BEFORE INSERT OR UPDATE ON public.user_journey_instances
  FOR EACH ROW EXECUTE FUNCTION public.validate_journey_instance_stage();

CREATE OR REPLACE FUNCTION public.validate_journey_approval_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.approval_status NOT IN ('pending','approved','rejected','skipped','expired') THEN
    RAISE EXCEPTION 'Invalid approval_status: %', NEW.approval_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_journey_approval
  BEFORE INSERT OR UPDATE ON public.user_journey_approval_states
  FOR EACH ROW EXECUTE FUNCTION public.validate_journey_approval_status();
