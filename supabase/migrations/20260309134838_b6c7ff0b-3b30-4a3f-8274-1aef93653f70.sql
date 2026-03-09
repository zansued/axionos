
-- Add diagnostic columns to pipeline_subjobs for per-attempt observability
ALTER TABLE public.pipeline_subjobs
  ADD COLUMN IF NOT EXISTS failure_type text DEFAULT null,
  ADD COLUMN IF NOT EXISTS diagnostics_log jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS prompt_size_chars integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS context_size_chars integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_trigger text DEFAULT null;

-- Add comment for documentation
COMMENT ON COLUMN public.pipeline_subjobs.failure_type IS 'Classified failure: failed_timeout, failed_provider, failed_parse, failed_persistence, failed_cleanup, failed_unknown';
COMMENT ON COLUMN public.pipeline_subjobs.diagnostics_log IS 'Array of per-attempt diagnostic records with timing, tokens, parse status, etc.';
COMMENT ON COLUMN public.pipeline_subjobs.retry_trigger IS 'What triggered the retry: auto_timeout, auto_parse, manual';
