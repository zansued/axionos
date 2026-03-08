
-- Sprint 67: Role-Based Experience Layer
-- 6 tables with full RLS by organization_id

-- 1. role_experience_models
CREATE TABLE public.role_experience_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  role_name text NOT NULL DEFAULT 'default_user',
  role_type text NOT NULL DEFAULT 'product_surface',
  default_surface_type text NOT NULL DEFAULT 'journey',
  navigation_profile_name text NOT NULL DEFAULT 'default',
  visibility_rules jsonb NOT NULL DEFAULT '{}',
  complexity_threshold numeric NOT NULL DEFAULT 0.5,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]',
  assumptions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.role_experience_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_experience_models_select" ON public.role_experience_models FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_experience_models_insert" ON public.role_experience_models FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_experience_models_update" ON public.role_experience_models FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. role_navigation_profiles
CREATE TABLE public.role_navigation_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  role_name text NOT NULL DEFAULT 'default_user',
  profile_name text NOT NULL DEFAULT 'default',
  navigation_items jsonb NOT NULL DEFAULT '[]',
  tab_items jsonb NOT NULL DEFAULT '[]',
  surface_priority text NOT NULL DEFAULT 'journey',
  visibility_density_score numeric NOT NULL DEFAULT 0.5,
  complexity_exposure_score numeric NOT NULL DEFAULT 0.3,
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.role_navigation_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_navigation_profiles_select" ON public.role_navigation_profiles FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_navigation_profiles_insert" ON public.role_navigation_profiles FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_navigation_profiles_update" ON public.role_navigation_profiles FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. role_surface_permissions
CREATE TABLE public.role_surface_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  role_name text NOT NULL DEFAULT 'default_user',
  permission_scope_type text NOT NULL DEFAULT 'view',
  permission_scope_id text DEFAULT NULL,
  surface_key text NOT NULL DEFAULT '',
  allowed boolean NOT NULL DEFAULT true,
  approval_visibility_score numeric NOT NULL DEFAULT 0.7,
  governance_surface_score numeric NOT NULL DEFAULT 0.5,
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.role_surface_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_surface_permissions_select" ON public.role_surface_permissions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_surface_permissions_insert" ON public.role_surface_permissions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_surface_permissions_update" ON public.role_surface_permissions FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 4. role_information_layers
CREATE TABLE public.role_information_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  role_name text NOT NULL DEFAULT 'default_user',
  information_class text NOT NULL DEFAULT '',
  visibility_mode text NOT NULL DEFAULT 'visible',
  summarization_level text NOT NULL DEFAULT 'full',
  information_summarization_score numeric NOT NULL DEFAULT 0.5,
  rationale text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.role_information_layers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_information_layers_select" ON public.role_information_layers FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_information_layers_insert" ON public.role_information_layers FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_information_layers_update" ON public.role_information_layers FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 5. role_experience_overrides
CREATE TABLE public.role_experience_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  role_name text NOT NULL DEFAULT 'default_user',
  override_key text NOT NULL DEFAULT '',
  override_value jsonb NOT NULL DEFAULT '{}',
  override_status text NOT NULL DEFAULT 'active',
  experience_quality_score numeric NOT NULL DEFAULT 0.5,
  friction_score numeric NOT NULL DEFAULT 0.3,
  recommendation_status text NOT NULL DEFAULT 'open',
  evidence_links jsonb NOT NULL DEFAULT '[]',
  assumptions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.role_experience_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_experience_overrides_select" ON public.role_experience_overrides FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_experience_overrides_insert" ON public.role_experience_overrides FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_experience_overrides_update" ON public.role_experience_overrides FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 6. role_experience_outcomes
CREATE TABLE public.role_experience_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  role_name text NOT NULL DEFAULT 'default_user',
  outcome_domain text NOT NULL DEFAULT 'navigation',
  expected_outcomes jsonb NOT NULL DEFAULT '{}',
  realized_outcomes jsonb NOT NULL DEFAULT '{}',
  role_experience_quality_score numeric NOT NULL DEFAULT 0.5,
  navigation_clarity_score numeric NOT NULL DEFAULT 0.5,
  complexity_exposure_score numeric NOT NULL DEFAULT 0.3,
  internal_complexity_leakage_score numeric NOT NULL DEFAULT 0.2,
  approval_visibility_score numeric NOT NULL DEFAULT 0.7,
  information_summarization_score numeric NOT NULL DEFAULT 0.5,
  operator_surface_effectiveness_score numeric NOT NULL DEFAULT 0.5,
  default_user_journey_clarity_score numeric NOT NULL DEFAULT 0.7,
  admin_surface_integrity_score numeric NOT NULL DEFAULT 0.5,
  permission_alignment_score numeric NOT NULL DEFAULT 0.7,
  role_friction_score numeric NOT NULL DEFAULT 0.3,
  role_experience_outcome_accuracy_score numeric NOT NULL DEFAULT 0.5,
  bounded_visibility_coherence_score numeric NOT NULL DEFAULT 0.5,
  role_surface_separation_score numeric NOT NULL DEFAULT 0.7,
  evidence_links jsonb NOT NULL DEFAULT '[]',
  assumptions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.role_experience_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_experience_outcomes_select" ON public.role_experience_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_experience_outcomes_insert" ON public.role_experience_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "role_experience_outcomes_update" ON public.role_experience_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_role_experience_model_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  IF NEW.role_name NOT IN ('default_user','operator','admin') THEN RAISE EXCEPTION 'Invalid role_name: %', NEW.role_name; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_role_experience_model BEFORE INSERT OR UPDATE ON public.role_experience_models FOR EACH ROW EXECUTE FUNCTION public.validate_role_experience_model_status();

CREATE OR REPLACE FUNCTION public.validate_role_navigation_profile_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  IF NEW.role_name NOT IN ('default_user','operator','admin') THEN RAISE EXCEPTION 'Invalid role_name: %', NEW.role_name; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_role_navigation_profile BEFORE INSERT OR UPDATE ON public.role_navigation_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_role_navigation_profile_status();

CREATE OR REPLACE FUNCTION public.validate_role_surface_permission_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  IF NEW.role_name NOT IN ('default_user','operator','admin') THEN RAISE EXCEPTION 'Invalid role_name: %', NEW.role_name; END IF;
  IF NEW.permission_scope_type NOT IN ('view','action','approval','admin') THEN RAISE EXCEPTION 'Invalid permission_scope_type: %', NEW.permission_scope_type; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_role_surface_permission BEFORE INSERT OR UPDATE ON public.role_surface_permissions FOR EACH ROW EXECUTE FUNCTION public.validate_role_surface_permission_status();

CREATE OR REPLACE FUNCTION public.validate_role_information_layer_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  IF NEW.role_name NOT IN ('default_user','operator','admin') THEN RAISE EXCEPTION 'Invalid role_name: %', NEW.role_name; END IF;
  IF NEW.visibility_mode NOT IN ('visible','summarized','hidden','deferred') THEN RAISE EXCEPTION 'Invalid visibility_mode: %', NEW.visibility_mode; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_role_information_layer BEFORE INSERT OR UPDATE ON public.role_information_layers FOR EACH ROW EXECUTE FUNCTION public.validate_role_information_layer_status();

CREATE OR REPLACE FUNCTION public.validate_role_experience_override_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.override_status NOT IN ('active','paused','deprecated') THEN RAISE EXCEPTION 'Invalid override_status: %', NEW.override_status; END IF;
  IF NEW.role_name NOT IN ('default_user','operator','admin') THEN RAISE EXCEPTION 'Invalid role_name: %', NEW.role_name; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_role_experience_override BEFORE INSERT OR UPDATE ON public.role_experience_overrides FOR EACH ROW EXECUTE FUNCTION public.validate_role_experience_override_status();

CREATE OR REPLACE FUNCTION public.validate_role_experience_outcome()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.role_name NOT IN ('default_user','operator','admin') THEN RAISE EXCEPTION 'Invalid role_name: %', NEW.role_name; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_role_experience_outcome BEFORE INSERT OR UPDATE ON public.role_experience_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_role_experience_outcome();
