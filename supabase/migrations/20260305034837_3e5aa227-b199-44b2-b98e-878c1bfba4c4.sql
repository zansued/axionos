
-- =============================================
-- PROJECT BRAIN: Core Knowledge Graph Tables
-- =============================================

-- 1. project_brain_nodes: Entities in the project graph
CREATE TABLE public.project_brain_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  node_type text NOT NULL DEFAULT 'file',
  name text NOT NULL,
  file_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  content_hash text,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. project_brain_edges: Relationships between nodes
CREATE TABLE public.project_brain_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  source_node_id uuid NOT NULL REFERENCES public.project_brain_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.project_brain_nodes(id) ON DELETE CASCADE,
  relation_type text NOT NULL DEFAULT 'depends_on',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. project_decisions: Architectural decisions with versioning
CREATE TABLE public.project_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  decision text NOT NULL,
  reason text NOT NULL,
  impact text,
  category text NOT NULL DEFAULT 'architecture',
  status text NOT NULL DEFAULT 'active',
  supersedes_id uuid REFERENCES public.project_decisions(id),
  decided_by_agent_id uuid REFERENCES public.agents(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. project_errors: Error learning system
CREATE TABLE public.project_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  file_path text,
  error_type text NOT NULL DEFAULT 'typescript',
  error_message text NOT NULL,
  root_cause text,
  prevention_rule text,
  fixed boolean NOT NULL DEFAULT false,
  fixed_by_agent_id uuid REFERENCES public.agents(id),
  detected_at timestamptz NOT NULL DEFAULT now(),
  fixed_at timestamptz
);

-- Indexes for performance
CREATE INDEX idx_brain_nodes_initiative ON public.project_brain_nodes(initiative_id);
CREATE INDEX idx_brain_nodes_type ON public.project_brain_nodes(node_type);
CREATE INDEX idx_brain_nodes_file_path ON public.project_brain_nodes(file_path);
CREATE INDEX idx_brain_edges_initiative ON public.project_brain_edges(initiative_id);
CREATE INDEX idx_brain_edges_source ON public.project_brain_edges(source_node_id);
CREATE INDEX idx_brain_edges_target ON public.project_brain_edges(target_node_id);
CREATE INDEX idx_project_decisions_initiative ON public.project_decisions(initiative_id);
CREATE INDEX idx_project_errors_initiative ON public.project_errors(initiative_id);
CREATE INDEX idx_project_errors_type ON public.project_errors(error_type);

-- Full-text search on node names for semantic queries
ALTER TABLE public.project_brain_nodes ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(file_path, '') || ' ' || coalesce(node_type, ''))) STORED;
CREATE INDEX idx_brain_nodes_search ON public.project_brain_nodes USING gin(search_vector);

-- Enable RLS
ALTER TABLE public.project_brain_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_brain_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Org members can view, Editors+ can manage
CREATE POLICY "Org members can view brain nodes" ON public.project_brain_nodes
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Editors+ can manage brain nodes" ON public.project_brain_nodes
  FOR ALL USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Org members can view brain edges" ON public.project_brain_edges
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Editors+ can manage brain edges" ON public.project_brain_edges
  FOR ALL USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Org members can view project decisions" ON public.project_decisions
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Editors+ can manage project decisions" ON public.project_decisions
  FOR ALL USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Org members can view project errors" ON public.project_errors
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Editors+ can manage project errors" ON public.project_errors
  FOR ALL USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

-- updated_at triggers
CREATE TRIGGER update_brain_nodes_updated_at BEFORE UPDATE ON public.project_brain_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON public.project_decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update delete_initiative_cascade to include brain tables
CREATE OR REPLACE FUNCTION public.delete_initiative_cascade(p_initiative_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _user_role org_role;
BEGIN
  SELECT organization_id INTO _org_id FROM initiatives WHERE id = p_initiative_id;
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Initiative not found';
  END IF;

  _user_role := get_user_org_role(auth.uid(), _org_id);
  IF _user_role IS NULL OR _user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owners/admins can delete initiatives';
  END IF;

  -- Delete brain data
  DELETE FROM project_brain_edges WHERE initiative_id = p_initiative_id;
  DELETE FROM project_brain_nodes WHERE initiative_id = p_initiative_id;
  DELETE FROM project_decisions WHERE initiative_id = p_initiative_id;
  DELETE FROM project_errors WHERE initiative_id = p_initiative_id;

  -- Delete stories and their children
  DELETE FROM story_phases WHERE story_id IN (
    SELECT id FROM stories WHERE initiative_id = p_initiative_id
  );
  DELETE FROM stories WHERE initiative_id = p_initiative_id;

  DELETE FROM agent_outputs WHERE initiative_id = p_initiative_id;
  DELETE FROM agent_memory WHERE initiative_id = p_initiative_id;
  UPDATE org_knowledge_base SET source_initiative_id = NULL WHERE source_initiative_id = p_initiative_id;

  DELETE FROM initiatives WHERE id = p_initiative_id;
END;
$function$;
