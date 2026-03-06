
ALTER TABLE public.initiatives
  ADD COLUMN IF NOT EXISTS simulation_report jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pipeline_recommendation text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS risk_flags jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_cost_min numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_cost_max numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_time_min integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_time_max integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recommended_generation_depth text DEFAULT NULL;
