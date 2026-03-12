
-- Add evaluation fields to canon_candidate_entries for the evolution engine
ALTER TABLE public.canon_candidate_entries 
  ADD COLUMN IF NOT EXISTS evaluation_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evaluation_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS evaluation_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS duplication_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pattern_classification text DEFAULT '',
  ADD COLUMN IF NOT EXISTS domain_classification text DEFAULT '',
  ADD COLUMN IF NOT EXISTS merged_with_id uuid REFERENCES public.canon_candidate_entries(id),
  ADD COLUMN IF NOT EXISTS merge_group_key text DEFAULT '';

-- Index for evolution engine queries
CREATE INDEX IF NOT EXISTS idx_cce_evaluation_status 
  ON public.canon_candidate_entries(evaluation_status);
CREATE INDEX IF NOT EXISTS idx_cce_evaluation_score 
  ON public.canon_candidate_entries(evaluation_score);
