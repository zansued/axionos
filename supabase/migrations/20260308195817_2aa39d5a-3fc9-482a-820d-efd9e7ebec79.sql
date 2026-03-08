
-- Sprint 71: Governed Extensibility & Developer Experience Foundation

-- Extension Registry: canonical catalog of platform extensions
CREATE TABLE public.platform_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  extension_key text NOT NULL,
  extension_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'integration',
  version text NOT NULL DEFAULT '0.1.0',
  status text NOT NULL DEFAULT 'available',
  risk_level text NOT NULL DEFAULT 'low',
  permissions_required jsonb NOT NULL DEFAULT '[]'::jsonb,
  compatibility_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  affected_surfaces jsonb NOT NULL DEFAULT '[]'::jsonb,
  rollback_ready boolean NOT NULL DEFAULT true,
  author text NOT NULL DEFAULT 'axionos',
  documentation_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, extension_key)
);

-- Extension Activation State: tracks install/enable/disable per org
CREATE TABLE public.extension_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  extension_id uuid NOT NULL REFERENCES public.platform_extensions(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id),
  activation_status text NOT NULL DEFAULT 'pending_approval',
  activated_by uuid,
  activated_at timestamptz,
  deactivated_at timestamptz,
  approval_status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  rollback_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, extension_id, workspace_id)
);

-- Extension Compatibility Checks: pre-activation assessments
CREATE TABLE public.extension_compatibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  extension_id uuid NOT NULL REFERENCES public.platform_extensions(id) ON DELETE CASCADE,
  check_type text NOT NULL DEFAULT 'pre_activation',
  compatibility_score numeric NOT NULL DEFAULT 1.0,
  risk_assessment text NOT NULL DEFAULT 'low',
  conflicts_detected jsonb NOT NULL DEFAULT '[]'::jsonb,
  requirements_met boolean NOT NULL DEFAULT true,
  check_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Extension Audit Log: all extension lifecycle events
CREATE TABLE public.extension_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  extension_id uuid NOT NULL REFERENCES public.platform_extensions(id) ON DELETE CASCADE,
  activation_id uuid REFERENCES public.extension_activations(id),
  event_type text NOT NULL,
  actor_id uuid,
  previous_state jsonb,
  new_state jsonb,
  event_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_platform_extension_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('available','installed','deprecated','suspended') THEN
    RAISE EXCEPTION 'Invalid platform_extensions status: %', NEW.status;
  END IF;
  IF NEW.risk_level NOT IN ('low','moderate','high','critical') THEN
    RAISE EXCEPTION 'Invalid risk_level: %', NEW.risk_level;
  END IF;
  IF NEW.category NOT IN ('integration','capability','provider','workflow','observability','governance') THEN
    RAISE EXCEPTION 'Invalid category: %', NEW.category;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_platform_extension
  BEFORE INSERT OR UPDATE ON public.platform_extensions
  FOR EACH ROW EXECUTE FUNCTION public.validate_platform_extension_status();

CREATE OR REPLACE FUNCTION public.validate_extension_activation_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.activation_status NOT IN ('pending_approval','active','inactive','rolled_back','rejected') THEN
    RAISE EXCEPTION 'Invalid activation_status: %', NEW.activation_status;
  END IF;
  IF NEW.approval_status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid approval_status: %', NEW.approval_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_extension_activation
  BEFORE INSERT OR UPDATE ON public.extension_activations
  FOR EACH ROW EXECUTE FUNCTION public.validate_extension_activation_status();

-- RLS
ALTER TABLE public.platform_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_compatibility_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view extensions" ON public.platform_extensions
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage extensions" ON public.platform_extensions
  FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE POLICY "Org members can view activations" ON public.extension_activations
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage activations" ON public.extension_activations
  FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE POLICY "Org members can view compat checks" ON public.extension_compatibility_checks
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage compat checks" ON public.extension_compatibility_checks
  FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE POLICY "Org members can view ext audit" ON public.extension_audit_events
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can insert ext audit" ON public.extension_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
