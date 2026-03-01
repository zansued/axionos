
-- 1. Pipeline status enum for initiatives
CREATE TYPE public.initiative_status AS ENUM (
  'idea', 'planning', 'architecting', 'ready', 'in_progress', 'validating', 'publishing', 'completed'
);

-- 2. Initiatives table (evolução de planning_sessions)
CREATE TABLE public.initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status initiative_status NOT NULL DEFAULT 'idea',
  prd_content TEXT,
  architecture_content TEXT,
  notes TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view initiatives"
  ON public.initiatives FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can create initiatives"
  ON public.initiatives FOR INSERT
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Editors+ can update initiatives"
  ON public.initiatives FOR UPDATE
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Admins can delete initiatives"
  ON public.initiatives FOR DELETE
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_initiatives_updated_at
  BEFORE UPDATE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Squads table
CREATE TABLE public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  auto_generated BOOLEAN NOT NULL DEFAULT false,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view squads"
  ON public.squads FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage squads"
  ON public.squads FOR ALL
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE TRIGGER update_squads_updated_at
  BEFORE UPDATE ON public.squads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Squad members (agent assignments)
CREATE TABLE public.squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  role_in_squad TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(squad_id, agent_id)
);

ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view squad members"
  ON public.squad_members FOR SELECT
  USING (squad_id IN (
    SELECT id FROM public.squads WHERE public.is_org_member(auth.uid(), organization_id)
  ));

CREATE POLICY "Editors+ can manage squad members"
  ON public.squad_members FOR ALL
  USING (squad_id IN (
    SELECT id FROM public.squads WHERE public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
  ))
  WITH CHECK (squad_id IN (
    SELECT id FROM public.squads WHERE public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
  ));

-- 5. Add initiative_id to stories
ALTER TABLE public.stories ADD COLUMN initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL;

-- 6. Migrate planning_sessions data to initiatives
INSERT INTO public.initiatives (title, description, status, prd_content, architecture_content, notes, organization_id, user_id, created_at, updated_at)
SELECT
  ps.title,
  ps.description,
  CASE
    WHEN ps.status = 'completed' THEN 'completed'::initiative_status
    WHEN ps.architecture_content IS NOT NULL THEN 'architecting'::initiative_status
    WHEN ps.prd_content IS NOT NULL THEN 'planning'::initiative_status
    ELSE 'idea'::initiative_status
  END,
  ps.prd_content,
  ps.architecture_content,
  ps.notes,
  COALESCE(ps.organization_id, (SELECT id FROM public.organizations LIMIT 1)),
  ps.user_id,
  ps.created_at,
  ps.updated_at
FROM public.planning_sessions ps
WHERE ps.organization_id IS NOT NULL;
