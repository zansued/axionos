
-- 1. Create role enum
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'editor', 'reviewer', 'viewer');

-- 2. Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Organization members (join table with roles)
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Workspaces
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 5. Security definer function to check membership (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_role(_user_id uuid, _org_id uuid)
RETURNS public.org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = _user_id AND organization_id = _org_id
  LIMIT 1
$$;

-- 6. RLS: organizations — members can see their orgs
CREATE POLICY "Members can view their organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Owners/admins can update organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (public.get_user_org_role(auth.uid(), id) IN ('owner', 'admin'));

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. RLS: organization_members
CREATE POLICY "Members can view org members"
ON public.organization_members FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Owners/admins can manage members"
ON public.organization_members FOR ALL
TO authenticated
USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'))
WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Allow self-insert (for org creation flow)
CREATE POLICY "Users can add themselves as member"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 8. RLS: workspaces
CREATE POLICY "Org members can view workspaces"
ON public.workspaces FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can create workspaces"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Editors+ can update workspaces"
ON public.workspaces FOR UPDATE
TO authenticated
USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Owners/admins can delete workspaces"
ON public.workspaces FOR DELETE
TO authenticated
USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- 9. Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Add organization_id to existing tables for future migration
ALTER TABLE public.agents ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.stories ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.planning_sessions ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.audit_logs ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- 11. Add workspace_id to stories and agents
ALTER TABLE public.stories ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
ALTER TABLE public.agents ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
