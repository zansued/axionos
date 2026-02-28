
-- Create a security definer function for atomic org setup
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  _name text,
  _slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _ws_id uuid;
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create organization
  INSERT INTO public.organizations (name, slug)
  VALUES (_name, _slug)
  RETURNING id INTO _org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, _user_id, 'owner');

  -- Create default workspace
  INSERT INTO public.workspaces (organization_id, name, slug)
  VALUES (_org_id, 'Default', 'default')
  RETURNING id INTO _ws_id;

  RETURN jsonb_build_object(
    'id', _org_id,
    'name', _name,
    'slug', _slug,
    'workspace_id', _ws_id
  );
END;
$$;
