
-- Create similarity search function with extensions in search_path
CREATE OR REPLACE FUNCTION public.match_brain_nodes(
  query_embedding vector(768),
  match_initiative_id uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  file_path text,
  node_type text,
  status text,
  content_hash text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pbn.id,
    pbn.name,
    pbn.file_path,
    pbn.node_type,
    pbn.status,
    pbn.content_hash,
    pbn.metadata,
    (1 - (pbn.embedding <=> query_embedding))::float AS similarity
  FROM project_brain_nodes pbn
  WHERE pbn.initiative_id = match_initiative_id
    AND pbn.embedding IS NOT NULL
    AND (1 - (pbn.embedding <=> query_embedding)) > match_threshold
  ORDER BY pbn.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to find nodes without embeddings
CREATE OR REPLACE FUNCTION public.get_unembedded_nodes(
  p_initiative_id uuid,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name text,
  file_path text,
  node_type text,
  metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pbn.id, pbn.name, pbn.file_path, pbn.node_type, pbn.metadata
  FROM project_brain_nodes pbn
  WHERE pbn.initiative_id = p_initiative_id
    AND pbn.embedding IS NULL
    AND pbn.status IN ('generated', 'validated', 'published')
  ORDER BY pbn.created_at
  LIMIT p_limit;
$$;
