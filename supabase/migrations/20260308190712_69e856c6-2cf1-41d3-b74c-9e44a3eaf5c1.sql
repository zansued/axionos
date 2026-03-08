
-- Sprint 70: Adoption Intelligence & Customer Success Loop
-- 6 tables with full RLS

-- 1. adoption_intelligence_models
CREATE TABLE public.adoption_intelligence_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  model_name text NOT NULL DEFAULT '',
  model_type text NOT NULL DEFAULT 'journey_adoption',
  milestone_definitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  success_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.adoption_intelligence_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aim_select" ON public.adoption_intelligence_models FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "aim_insert" ON public.adoption_intelligence_models FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "aim_update" ON public.adoption_intelligence_models FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. customer_success_signals
CREATE TABLE public.customer_success_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  user_role_type text NOT NULL DEFAULT 'default_user',
  signal_type text NOT NULL DEFAULT 'milestone_completion',
  signal_strength numeric NOT NULL DEFAULT 0.5,
  journey_stage text NOT NULL DEFAULT 'unknown',
  milestone_type text NOT NULL DEFAULT '',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_success_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "css_select" ON public.customer_success_signals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "css_insert" ON public.customer_success_signals FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 3. adoption_journey_events
CREATE TABLE public.adoption_journey_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  user_role_type text NOT NULL DEFAULT 'default_user',
  event_type text NOT NULL DEFAULT 'stage_entered',
  journey_stage text NOT NULL DEFAULT 'unknown',
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.adoption_journey_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aje_select" ON public.adoption_journey_events FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "aje_insert" ON public.adoption_journey_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. adoption_friction_clusters
CREATE TABLE public.adoption_friction_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  cluster_name text NOT NULL DEFAULT '',
  friction_zone text NOT NULL DEFAULT '',
  journey_stage text NOT NULL DEFAULT 'unknown',
  occurrence_count int NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'moderate',
  remediation_hint text NOT NULL DEFAULT '',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.adoption_friction_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "afc_select" ON public.adoption_friction_clusters FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "afc_insert" ON public.adoption_friction_clusters FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "afc_update" ON public.adoption_friction_clusters FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 5. customer_success_recommendations
CREATE TABLE public.customer_success_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL DEFAULT 'suggest_guidance',
  priority_score numeric NOT NULL DEFAULT 0.5,
  target_stage text NOT NULL DEFAULT '',
  target_role text NOT NULL DEFAULT 'default_user',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_success_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csr_select" ON public.customer_success_recommendations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "csr_insert" ON public.customer_success_recommendations FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "csr_update" ON public.customer_success_recommendations FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 6. adoption_outcomes
CREATE TABLE public.adoption_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  outcome_domain text NOT NULL DEFAULT 'adoption',
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  accuracy_score numeric NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.adoption_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ao_select" ON public.adoption_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "ao_insert" ON public.adoption_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_adoption_model_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_adoption_model BEFORE INSERT OR UPDATE ON public.adoption_intelligence_models FOR EACH ROW EXECUTE FUNCTION public.validate_adoption_model_status();

CREATE OR REPLACE FUNCTION public.validate_success_recommendation_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','reviewed','accepted','rejected','dismissed') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_success_recommendation BEFORE INSERT OR UPDATE ON public.customer_success_recommendations FOR EACH ROW EXECUTE FUNCTION public.validate_success_recommendation_status();
