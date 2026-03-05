-- Gate permissions: which roles can perform which actions at each pipeline stage
CREATE TABLE public.pipeline_gate_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stage text NOT NULL,
  action_type text NOT NULL DEFAULT 'approve',
  min_role public.org_role NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, stage, action_type)
);

ALTER TABLE public.pipeline_gate_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage gate permissions
CREATE POLICY "Admins can manage gate permissions"
  ON public.pipeline_gate_permissions
  FOR ALL
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Org members can view gate permissions
CREATE POLICY "Org members can view gate permissions"
  ON public.pipeline_gate_permissions
  FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- Helper: check if user has permission for a gate action
CREATE OR REPLACE FUNCTION public.has_gate_permission(
  _user_id uuid,
  _org_id uuid,
  _stage text,
  _action_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- If no permission configured for this gate, allow editors+
    WHEN NOT EXISTS (
      SELECT 1 FROM pipeline_gate_permissions
      WHERE organization_id = _org_id AND stage = _stage AND action_type = _action_type
    ) THEN get_user_org_role(_user_id, _org_id) IN ('owner', 'admin', 'editor')
    -- Otherwise check against configured min_role
    ELSE (
      SELECT CASE pgp.min_role
        WHEN 'viewer' THEN get_user_org_role(_user_id, _org_id) IS NOT NULL
        WHEN 'editor' THEN get_user_org_role(_user_id, _org_id) IN ('owner', 'admin', 'editor')
        WHEN 'admin' THEN get_user_org_role(_user_id, _org_id) IN ('owner', 'admin')
        WHEN 'owner' THEN get_user_org_role(_user_id, _org_id) = 'owner'
        ELSE false
      END
      FROM pipeline_gate_permissions pgp
      WHERE pgp.organization_id = _org_id AND pgp.stage = _stage AND pgp.action_type = _action_type
      LIMIT 1
    )
  END
$$;

-- Trigger for updated_at
CREATE TRIGGER update_pipeline_gate_permissions_updated_at
  BEFORE UPDATE ON public.pipeline_gate_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();