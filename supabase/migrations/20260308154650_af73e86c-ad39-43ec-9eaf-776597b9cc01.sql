
-- Sprint 69: Onboarding, Templates & Vertical Starters Layer

-- 1. onboarding_flows
CREATE TABLE public.onboarding_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  flow_name text NOT NULL DEFAULT '',
  flow_type text NOT NULL DEFAULT 'guided',
  step_definitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_role text NOT NULL DEFAULT 'default_user',
  onboarding_clarity_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_flows_select" ON public.onboarding_flows FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "onboarding_flows_insert" ON public.onboarding_flows FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "onboarding_flows_update" ON public.onboarding_flows FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. initiative_templates (DB)
CREATE TABLE public.initiative_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  template_name text NOT NULL DEFAULT '',
  template_type text NOT NULL DEFAULT 'general',
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '📦',
  idea_scaffold text NOT NULL DEFAULT '',
  discovery_hints jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  template_fit_score numeric NOT NULL DEFAULT 0,
  starter_confidence_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.initiative_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "initiative_templates_select" ON public.initiative_templates FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "initiative_templates_insert" ON public.initiative_templates FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "initiative_templates_update" ON public.initiative_templates FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. vertical_starters
CREATE TABLE public.vertical_starters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  vertical_name text NOT NULL DEFAULT '',
  starter_type text NOT NULL DEFAULT 'domain',
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '🚀',
  included_templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_stack jsonb NOT NULL DEFAULT '{}'::jsonb,
  vertical_fit_score numeric NOT NULL DEFAULT 0,
  assumption_visibility_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vertical_starters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vertical_starters_select" ON public.vertical_starters FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "vertical_starters_insert" ON public.vertical_starters FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "vertical_starters_update" ON public.vertical_starters FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 4. template_initialization_rules
CREATE TABLE public.template_initialization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  template_id uuid REFERENCES public.initiative_templates(id),
  vertical_starter_id uuid REFERENCES public.vertical_starters(id),
  rule_name text NOT NULL DEFAULT '',
  initialization_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  journey_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  starter_artifacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  initialization_quality_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.template_initialization_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template_init_rules_select" ON public.template_initialization_rules FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "template_init_rules_insert" ON public.template_initialization_rules FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "template_init_rules_update" ON public.template_initialization_rules FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 5. onboarding_sessions
CREATE TABLE public.onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  user_id uuid NOT NULL,
  flow_id uuid REFERENCES public.onboarding_flows(id),
  template_id uuid REFERENCES public.initiative_templates(id),
  vertical_starter_id uuid REFERENCES public.vertical_starters(id),
  current_step integer NOT NULL DEFAULT 0,
  onboarding_progress_score numeric NOT NULL DEFAULT 0,
  first_run_friction_score numeric NOT NULL DEFAULT 0,
  abandonment_risk_score numeric NOT NULL DEFAULT 0,
  session_status text NOT NULL DEFAULT 'active',
  friction_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  selections jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_sessions_select" ON public.onboarding_sessions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "onboarding_sessions_insert" ON public.onboarding_sessions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "onboarding_sessions_update" ON public.onboarding_sessions FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 6. onboarding_outcomes
CREATE TABLE public.onboarding_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  session_id uuid REFERENCES public.onboarding_sessions(id),
  template_id uuid REFERENCES public.initiative_templates(id),
  vertical_starter_id uuid REFERENCES public.vertical_starters(id),
  initiative_id uuid REFERENCES public.initiatives(id),
  template_usefulness_score numeric NOT NULL DEFAULT 0,
  starter_path_effectiveness_score numeric NOT NULL DEFAULT 0,
  onboarding_outcome_accuracy_score numeric NOT NULL DEFAULT 0,
  guided_start_coherence_score numeric NOT NULL DEFAULT 0,
  false_fit_penalty_score numeric NOT NULL DEFAULT 0,
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_outcomes_select" ON public.onboarding_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "onboarding_outcomes_insert" ON public.onboarding_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "onboarding_outcomes_update" ON public.onboarding_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_onboarding_flow_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_onboarding_flow BEFORE INSERT OR UPDATE ON public.onboarding_flows FOR EACH ROW EXECUTE FUNCTION public.validate_onboarding_flow_status();

CREATE OR REPLACE FUNCTION public.validate_initiative_template_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_initiative_template BEFORE INSERT OR UPDATE ON public.initiative_templates FOR EACH ROW EXECUTE FUNCTION public.validate_initiative_template_status();

CREATE OR REPLACE FUNCTION public.validate_vertical_starter_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_vertical_starter BEFORE INSERT OR UPDATE ON public.vertical_starters FOR EACH ROW EXECUTE FUNCTION public.validate_vertical_starter_status();

CREATE OR REPLACE FUNCTION public.validate_onboarding_session_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.session_status NOT IN ('active','completed','abandoned','paused') THEN RAISE EXCEPTION 'Invalid session_status: %', NEW.session_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_onboarding_session BEFORE INSERT OR UPDATE ON public.onboarding_sessions FOR EACH ROW EXECUTE FUNCTION public.validate_onboarding_session_status();
