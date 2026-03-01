
-- Table to store GitHub repository connections per workspace
CREATE TABLE public.git_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'github',
  repo_owner text NOT NULL,
  repo_name text NOT NULL,
  default_branch text NOT NULL DEFAULT 'main',
  status text NOT NULL DEFAULT 'active',
  connected_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, repo_owner, repo_name)
);

-- Enable RLS
ALTER TABLE public.git_connections ENABLE ROW LEVEL SECURITY;

-- Org members can view connections
CREATE POLICY "Org members can view git connections"
ON public.git_connections
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Editors+ can manage connections
CREATE POLICY "Editors+ can manage git connections"
ON public.git_connections
FOR INSERT
WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

CREATE POLICY "Editors+ can update git connections"
ON public.git_connections
FOR UPDATE
USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

CREATE POLICY "Admins can delete git connections"
ON public.git_connections
FOR DELETE
USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role]));

-- Trigger for updated_at
CREATE TRIGGER update_git_connections_updated_at
BEFORE UPDATE ON public.git_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
