ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'bootstrapping_schema';
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'schema_bootstrapped';