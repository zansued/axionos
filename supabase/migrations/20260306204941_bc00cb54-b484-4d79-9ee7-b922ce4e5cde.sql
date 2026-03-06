
ALTER TABLE public.initiatives
  ADD COLUMN IF NOT EXISTS initiative_brief jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS idea_analysis jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS blueprint jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS generation_depth text DEFAULT NULL;
