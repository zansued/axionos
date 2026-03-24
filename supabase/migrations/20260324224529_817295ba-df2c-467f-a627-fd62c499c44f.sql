
-- Sprint 212: Initiative File Manifest
-- Tracks all planned vs generated files per initiative

CREATE TABLE IF NOT EXISTS public.initiative_file_manifest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  subtask_id UUID REFERENCES public.story_subtasks(id) ON DELETE SET NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
  node_id UUID,
  wave_num INTEGER,
  content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(initiative_id, file_path)
);

-- Index for fast lookups by initiative
CREATE INDEX IF NOT EXISTS idx_file_manifest_initiative ON public.initiative_file_manifest(initiative_id);
CREATE INDEX IF NOT EXISTS idx_file_manifest_org ON public.initiative_file_manifest(organization_id);
CREATE INDEX IF NOT EXISTS idx_file_manifest_status ON public.initiative_file_manifest(initiative_id, status);

-- RLS
ALTER TABLE public.initiative_file_manifest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org manifests"
  ON public.initiative_file_manifest FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role full access to manifests"
  ON public.initiative_file_manifest FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.initiative_file_manifest IS 'Sprint 212: Tracks planned vs generated files per initiative for import validation and build gating';
COMMENT ON COLUMN public.initiative_file_manifest.status IS 'planned | generating | generated | failed | skipped';
