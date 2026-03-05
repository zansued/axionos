
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'generating_data_model';
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'data_model_generated';
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'generating_ui';
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'ui_generated';
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'learning_system';
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'system_learned';
