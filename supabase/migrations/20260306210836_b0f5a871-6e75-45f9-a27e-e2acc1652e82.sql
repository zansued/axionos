-- Add deploy metadata columns to initiatives
ALTER TABLE public.initiatives
  ADD COLUMN IF NOT EXISTS deploy_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deploy_target TEXT DEFAULT 'vercel',
  ADD COLUMN IF NOT EXISTS deploy_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS repo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commit_hash TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS build_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add deploying/deployed/deploy_failed to the stage_status enum
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'deploying';
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'deployed';
ALTER TYPE public.initiative_stage_status ADD VALUE IF NOT EXISTS 'deploy_failed';