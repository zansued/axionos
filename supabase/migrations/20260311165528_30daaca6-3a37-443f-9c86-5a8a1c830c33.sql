
-- Add ingestion lifecycle state to canon_sources
ALTER TABLE public.canon_sources 
ADD COLUMN IF NOT EXISTS ingestion_lifecycle_state text NOT NULL DEFAULT 'discovered';

-- Add promotion tracking columns to canon_candidate_entries
ALTER TABLE public.canon_candidate_entries 
ADD COLUMN IF NOT EXISTS promoted_entry_id uuid REFERENCES public.canon_entries(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS promoted_at timestamptz;

-- Add source tracking to canon_entries  
ALTER TABLE public.canon_entries
ADD COLUMN IF NOT EXISTS source_candidate_id uuid REFERENCES public.canon_candidate_entries(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_sync_run_id uuid;

-- Add ingestion stats to canon_source_sync_runs
ALTER TABLE public.canon_source_sync_runs
ADD COLUMN IF NOT EXISTS documents_fetched integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS chunks_created integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS candidates_promoted integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS duplicates_skipped integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifecycle_state text NOT NULL DEFAULT 'queued';
