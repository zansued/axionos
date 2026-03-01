
-- Add discovery columns to initiatives (Stage 1 output)
ALTER TABLE public.initiatives
  ADD COLUMN IF NOT EXISTS refined_idea TEXT,
  ADD COLUMN IF NOT EXISTS business_model TEXT,
  ADD COLUMN IF NOT EXISTS mvp_scope TEXT,
  ADD COLUMN IF NOT EXISTS complexity TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS suggested_stack TEXT,
  ADD COLUMN IF NOT EXISTS strategic_vision TEXT,
  ADD COLUMN IF NOT EXISTS market_analysis TEXT,
  ADD COLUMN IF NOT EXISTS feasibility_analysis TEXT,
  ADD COLUMN IF NOT EXISTS initial_estimate JSONB DEFAULT '{}';

-- Update status enum to reflect the new stages
-- We need to add 'discovery' and 'squad_formation' to the enum
ALTER TYPE public.initiative_status ADD VALUE IF NOT EXISTS 'discovery' BEFORE 'planning';
ALTER TYPE public.initiative_status ADD VALUE IF NOT EXISTS 'squad_formation' AFTER 'discovery';
