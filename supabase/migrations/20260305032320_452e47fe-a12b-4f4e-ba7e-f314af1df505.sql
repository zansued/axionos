-- Add architecture stage statuses for Layer 2
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'architecture_ready';
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'architecting';
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'architected';