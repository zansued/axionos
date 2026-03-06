
-- Semantic Cache for AI Efficiency Layer
CREATE TABLE public.ai_prompt_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash text NOT NULL,
  embedding vector(768),
  prompt_summary text,
  response text NOT NULL,
  stage text NOT NULL,
  model_used text,
  tokens_saved integer DEFAULT 0,
  hit_count integer DEFAULT 0,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Index for hash lookups
CREATE INDEX idx_ai_prompt_cache_hash ON public.ai_prompt_cache(prompt_hash);

-- Index for vector similarity search
CREATE INDEX idx_ai_prompt_cache_embedding ON public.ai_prompt_cache
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Index for expiration cleanup
CREATE INDEX idx_ai_prompt_cache_expires ON public.ai_prompt_cache(expires_at);

-- RLS
ALTER TABLE public.ai_prompt_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages cache"
  ON public.ai_prompt_cache FOR ALL
  USING (true) WITH CHECK (true);

-- Function to search cache by vector similarity
CREATE OR REPLACE FUNCTION public.match_prompt_cache(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.92,
  match_stage text DEFAULT NULL,
  match_org_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  prompt_hash text,
  response text,
  stage text,
  model_used text,
  similarity float
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    apc.id,
    apc.prompt_hash,
    apc.response,
    apc.stage,
    apc.model_used,
    (1 - (apc.embedding <=> query_embedding))::float AS similarity
  FROM public.ai_prompt_cache apc
  WHERE apc.expires_at > now()
    AND apc.embedding IS NOT NULL
    AND (match_stage IS NULL OR apc.stage = match_stage)
    AND (match_org_id IS NULL OR apc.organization_id = match_org_id)
    AND (1 - (apc.embedding <=> query_embedding)) > match_threshold
  ORDER BY apc.embedding <=> query_embedding
  LIMIT 1;
END;
$$;
