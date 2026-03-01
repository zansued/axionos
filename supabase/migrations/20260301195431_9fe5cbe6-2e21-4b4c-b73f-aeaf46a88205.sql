
-- 1. Create new initiative_stage_status enum with approval gates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'initiative_stage_status') THEN
    CREATE TYPE public.initiative_stage_status AS ENUM (
      'draft',
      'discovery_ready',
      'discovering',
      'discovered',
      'squad_ready',
      'forming_squad',
      'squad_formed',
      'planning_ready',
      'planning',
      'planned',
      'in_progress',
      'validating',
      'ready_to_publish',
      'published',
      'completed',
      'rejected',
      'archived'
    );
  END IF;
END $$;

-- 2. Add new columns to initiatives
ALTER TABLE public.initiatives
  ADD COLUMN IF NOT EXISTS idea_raw text,
  ADD COLUMN IF NOT EXISTS discovery_payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stage_status initiative_stage_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS target_user text,
  ADD COLUMN IF NOT EXISTS approved_at_discovery timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at_squad timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at_planning timestamptz;

-- 3. Migrate existing data: copy idea from description/title to idea_raw
UPDATE public.initiatives SET idea_raw = COALESCE(description, title) WHERE idea_raw IS NULL;

-- 4. Consolidate existing discovery columns into discovery_payload
UPDATE public.initiatives SET discovery_payload = jsonb_build_object(
  'refined_idea', refined_idea,
  'business_model', business_model,
  'mvp_scope', mvp_scope,
  'market_analysis', market_analysis,
  'strategic_vision', strategic_vision,
  'suggested_stack', suggested_stack,
  'feasibility_analysis', feasibility_analysis,
  'initial_estimate', initial_estimate
) WHERE refined_idea IS NOT NULL AND (discovery_payload IS NULL OR discovery_payload = '{}'::jsonb);

-- 5. Map old status to new stage_status
UPDATE public.initiatives SET stage_status = 'draft' WHERE status = 'idea';
UPDATE public.initiatives SET stage_status = 'discovered' WHERE status = 'discovery';
UPDATE public.initiatives SET stage_status = 'squad_formed' WHERE status = 'squad_formation';
UPDATE public.initiatives SET stage_status = 'planned' WHERE status = 'planning';
UPDATE public.initiatives SET stage_status = 'planned' WHERE status = 'architecting';
UPDATE public.initiatives SET stage_status = 'planned' WHERE status = 'ready';
UPDATE public.initiatives SET stage_status = 'in_progress' WHERE status = 'in_progress';
UPDATE public.initiatives SET stage_status = 'validating' WHERE status = 'validating';
UPDATE public.initiatives SET stage_status = 'published' WHERE status = 'publishing';
UPDATE public.initiatives SET stage_status = 'completed' WHERE status = 'completed';

-- 6. Create jobs table (CFO da verdade)
CREATE TABLE IF NOT EXISTS public.initiative_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  stage text NOT NULL, -- discovery, squad_formation, planning, execution, validation, publish
  status text NOT NULL DEFAULT 'queued', -- queued, running, success, failed, canceled
  inputs jsonb DEFAULT '{}'::jsonb,
  outputs jsonb DEFAULT '{}'::jsonb,
  model text,
  prompt_hash text,
  cost_usd numeric DEFAULT 0,
  duration_ms integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  user_id uuid NOT NULL
);

-- 7. RLS for initiative_jobs
ALTER TABLE public.initiative_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view jobs"
  ON public.initiative_jobs FOR SELECT
  USING (initiative_id IN (
    SELECT id FROM public.initiatives WHERE is_org_member(auth.uid(), organization_id)
  ));

CREATE POLICY "Editors+ can create jobs"
  ON public.initiative_jobs FOR INSERT
  WITH CHECK (initiative_id IN (
    SELECT id FROM public.initiatives
    WHERE get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role])
  ));

CREATE POLICY "Editors+ can update jobs"
  ON public.initiative_jobs FOR UPDATE
  USING (initiative_id IN (
    SELECT id FROM public.initiatives
    WHERE get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role])
  ));

-- 8. Index for fast job lookups
CREATE INDEX IF NOT EXISTS idx_initiative_jobs_initiative_id ON public.initiative_jobs(initiative_id);
CREATE INDEX IF NOT EXISTS idx_initiative_jobs_stage_status ON public.initiative_jobs(stage, status);
