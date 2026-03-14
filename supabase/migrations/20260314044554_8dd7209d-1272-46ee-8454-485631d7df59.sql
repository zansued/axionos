
-- Sprint 205: Canon Graph Memory Foundation (complete)

-- Relation type enum
DO $$ BEGIN
  CREATE TYPE public.canon_graph_relation_type AS ENUM (
    'supports', 'contradicts', 'supersedes', 'depends_on', 'similar_to', 'derived_from'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Graph Nodes
CREATE TABLE IF NOT EXISTS public.canon_graph_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  canon_entry_id uuid NOT NULL,
  node_type text NOT NULL DEFAULT 'canon_entry',
  label text NOT NULL DEFAULT '',
  domain_scope text NOT NULL DEFAULT 'general',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  centrality_score numeric NOT NULL DEFAULT 0,
  cluster_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, canon_entry_id)
);

-- Graph Edges
CREATE TABLE IF NOT EXISTS public.canon_graph_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES public.canon_graph_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.canon_graph_nodes(id) ON DELETE CASCADE,
  relation_type public.canon_graph_relation_type NOT NULL,
  strength numeric NOT NULL DEFAULT 0.5,
  confidence numeric NOT NULL DEFAULT 0.5,
  provenance_source text NOT NULL DEFAULT 'system',
  provenance_detail text,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  bidirectional boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_node_id, target_node_id, relation_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_canon_graph_nodes_org ON public.canon_graph_nodes(organization_id);
CREATE INDEX IF NOT EXISTS idx_canon_graph_nodes_entry ON public.canon_graph_nodes(canon_entry_id);
CREATE INDEX IF NOT EXISTS idx_canon_graph_edges_org ON public.canon_graph_edges(organization_id);
CREATE INDEX IF NOT EXISTS idx_canon_graph_edges_source ON public.canon_graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_canon_graph_edges_target ON public.canon_graph_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_canon_graph_edges_type ON public.canon_graph_edges(relation_type);

-- RLS
ALTER TABLE public.canon_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canon_graph_edges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "graph_nodes_select" ON public.canon_graph_nodes FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "graph_nodes_insert" ON public.canon_graph_nodes FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "graph_nodes_update" ON public.canon_graph_nodes FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "graph_nodes_delete" ON public.canon_graph_nodes FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "graph_edges_select" ON public.canon_graph_edges FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "graph_edges_insert" ON public.canon_graph_edges FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "graph_edges_update" ON public.canon_graph_edges FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "graph_edges_delete" ON public.canon_graph_edges FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Neighborhood retrieval function
CREATE OR REPLACE FUNCTION public.get_canon_graph_neighborhood(
  p_organization_id uuid,
  p_node_id uuid,
  p_depth integer DEFAULT 1,
  p_relation_types text[] DEFAULT NULL,
  p_min_strength numeric DEFAULT 0
)
RETURNS TABLE (
  node_id uuid,
  canon_entry_id uuid,
  label text,
  node_type text,
  domain_scope text,
  centrality_score numeric,
  edge_id uuid,
  relation_type text,
  strength numeric,
  confidence numeric,
  direction text,
  provenance_source text,
  depth integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE neighborhood AS (
    SELECT
      n.id AS node_id, n.canon_entry_id, n.label, n.node_type, n.domain_scope, n.centrality_score,
      NULL::uuid AS edge_id, NULL::text AS relation_type, NULL::numeric AS strength,
      NULL::numeric AS confidence, 'self'::text AS direction, NULL::text AS provenance_source, 0 AS depth
    FROM canon_graph_nodes n
    WHERE n.id = p_node_id AND n.organization_id = p_organization_id

    UNION

    SELECT tn.id, tn.canon_entry_id, tn.label, tn.node_type, tn.domain_scope, tn.centrality_score,
      e.id, e.relation_type::text, e.strength, e.confidence, 'outbound'::text, e.provenance_source, nb.depth + 1
    FROM neighborhood nb
    JOIN canon_graph_edges e ON e.source_node_id = nb.node_id
      AND e.organization_id = p_organization_id AND e.strength >= p_min_strength
      AND (p_relation_types IS NULL OR e.relation_type::text = ANY(p_relation_types))
    JOIN canon_graph_nodes tn ON tn.id = e.target_node_id
    WHERE nb.depth < p_depth

    UNION

    SELECT sn.id, sn.canon_entry_id, sn.label, sn.node_type, sn.domain_scope, sn.centrality_score,
      e.id, e.relation_type::text, e.strength, e.confidence, 'inbound'::text, e.provenance_source, nb.depth + 1
    FROM neighborhood nb
    JOIN canon_graph_edges e ON e.target_node_id = nb.node_id
      AND e.organization_id = p_organization_id AND e.strength >= p_min_strength
      AND (p_relation_types IS NULL OR e.relation_type::text = ANY(p_relation_types))
    JOIN canon_graph_nodes sn ON sn.id = e.source_node_id
    WHERE nb.depth < p_depth
  )
  SELECT DISTINCT ON (neighborhood.node_id, neighborhood.edge_id)
    neighborhood.node_id, neighborhood.canon_entry_id, neighborhood.label,
    neighborhood.node_type, neighborhood.domain_scope, neighborhood.centrality_score,
    neighborhood.edge_id, neighborhood.relation_type, neighborhood.strength,
    neighborhood.confidence, neighborhood.direction, neighborhood.provenance_source, neighborhood.depth
  FROM neighborhood
  ORDER BY neighborhood.node_id, neighborhood.edge_id, neighborhood.depth;
END;
$$;

-- Auto-create graph node trigger
CREATE OR REPLACE FUNCTION public.auto_create_graph_node()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO canon_graph_nodes (organization_id, canon_entry_id, label, node_type, domain_scope)
  VALUES (
    NEW.organization_id, NEW.id,
    COALESCE(NEW.title, ''),
    COALESCE(NEW.canon_type::text, 'pattern'),
    COALESCE(NEW.stack_scope, 'general')
  )
  ON CONFLICT (organization_id, canon_entry_id) DO UPDATE
  SET label = EXCLUDED.label, node_type = EXCLUDED.node_type,
      domain_scope = EXCLUDED.domain_scope, updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_graph_node ON public.canon_entries;
CREATE TRIGGER trg_auto_create_graph_node
  AFTER INSERT OR UPDATE ON public.canon_entries
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_graph_node();

-- Seed existing entries
INSERT INTO public.canon_graph_nodes (organization_id, canon_entry_id, label, node_type, domain_scope)
SELECT organization_id, id, COALESCE(title, ''), COALESCE(canon_type::text, 'pattern'), COALESCE(stack_scope, 'general')
FROM public.canon_entries
ON CONFLICT (organization_id, canon_entry_id) DO NOTHING;
