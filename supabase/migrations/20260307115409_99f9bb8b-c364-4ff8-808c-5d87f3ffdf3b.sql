
-- =============================================
-- Sprint 15: Engineering Memory Foundation
-- =============================================

-- 1. engineering_memory_entries
CREATE TABLE public.engineering_memory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  memory_type text NOT NULL DEFAULT 'ExecutionMemory',
  memory_subtype text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT '',
  source_id uuid,
  related_component text,
  related_stage text,
  confidence_score numeric NOT NULL DEFAULT 0.5,
  relevance_score numeric NOT NULL DEFAULT 0.5,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz,
  times_retrieved integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_eme_organization ON public.engineering_memory_entries(organization_id);
CREATE INDEX idx_eme_workspace ON public.engineering_memory_entries(workspace_id);
CREATE INDEX idx_eme_memory_type ON public.engineering_memory_entries(memory_type);
CREATE INDEX idx_eme_source_type ON public.engineering_memory_entries(source_type);
CREATE INDEX idx_eme_created_at ON public.engineering_memory_entries(created_at DESC);

ALTER TABLE public.engineering_memory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view memory entries"
  ON public.engineering_memory_entries FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can insert memory entries"
  ON public.engineering_memory_entries FOR INSERT TO authenticated
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

CREATE POLICY "Editors+ can update memory entries"
  ON public.engineering_memory_entries FOR UPDATE TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

CREATE POLICY "Admins can delete memory entries"
  ON public.engineering_memory_entries FOR DELETE TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role]));

-- 2. memory_links
CREATE TABLE public.memory_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_memory_id uuid NOT NULL REFERENCES public.engineering_memory_entries(id) ON DELETE CASCADE,
  to_memory_id uuid NOT NULL REFERENCES public.engineering_memory_entries(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'similar_to',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_memory_id, to_memory_id, link_type)
);

CREATE INDEX idx_ml_organization ON public.memory_links(organization_id);
CREATE INDEX idx_ml_from ON public.memory_links(from_memory_id);
CREATE INDEX idx_ml_to ON public.memory_links(to_memory_id);

ALTER TABLE public.memory_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view memory links"
  ON public.memory_links FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can insert memory links"
  ON public.memory_links FOR INSERT TO authenticated
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

CREATE POLICY "Editors+ can update memory links"
  ON public.memory_links FOR UPDATE TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

CREATE POLICY "Admins can delete memory links"
  ON public.memory_links FOR DELETE TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role]));

-- 3. memory_retrieval_log
CREATE TABLE public.memory_retrieval_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  memory_id uuid NOT NULL REFERENCES public.engineering_memory_entries(id) ON DELETE CASCADE,
  retrieved_by_component text NOT NULL DEFAULT '',
  retrieval_context text,
  used_in_decision boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mrl_organization ON public.memory_retrieval_log(organization_id);
CREATE INDEX idx_mrl_memory ON public.memory_retrieval_log(memory_id);
CREATE INDEX idx_mrl_created_at ON public.memory_retrieval_log(created_at DESC);

ALTER TABLE public.memory_retrieval_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view retrieval logs"
  ON public.memory_retrieval_log FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can insert retrieval logs"
  ON public.memory_retrieval_log FOR INSERT TO authenticated
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));
