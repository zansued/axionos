
CREATE TABLE public.supabase_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  connected_by uuid NOT NULL,
  label text NOT NULL DEFAULT '',
  supabase_url text NOT NULL,
  supabase_anon_key text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supabase_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view supabase connections"
  ON public.supabase_connections FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can create supabase connections"
  ON public.supabase_connections FOR INSERT
  TO authenticated
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

CREATE POLICY "Editors+ can update supabase connections"
  ON public.supabase_connections FOR UPDATE
  TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

CREATE POLICY "Admins can delete supabase connections"
  ON public.supabase_connections FOR DELETE
  TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role]));

CREATE TRIGGER update_supabase_connections_updated_at
  BEFORE UPDATE ON public.supabase_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
