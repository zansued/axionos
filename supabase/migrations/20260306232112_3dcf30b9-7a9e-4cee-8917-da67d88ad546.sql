
-- repair_evidence table for Sprint 6
CREATE TABLE public.repair_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  stage_name text NOT NULL,
  job_id uuid REFERENCES public.initiative_jobs(id),
  error_category text NOT NULL DEFAULT 'unknown_error',
  error_code text NOT NULL DEFAULT 'UNKNOWN',
  error_message text NOT NULL DEFAULT '',
  error_signature text NOT NULL DEFAULT '',
  failure_context jsonb DEFAULT '{}'::jsonb,
  repair_strategy text NOT NULL DEFAULT 'ai_contextual_patch',
  repair_prompt_version text,
  attempt_number integer NOT NULL DEFAULT 1,
  patch_summary text NOT NULL DEFAULT '',
  files_touched text[] DEFAULT '{}'::text[],
  validation_before jsonb DEFAULT '{}'::jsonb,
  validation_after jsonb DEFAULT '{}'::jsonb,
  repair_result text NOT NULL DEFAULT 'attempted',
  revalidation_status text NOT NULL DEFAULT 'not_run',
  duration_ms integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.repair_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view repair evidence"
  ON public.repair_evidence FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage repair evidence"
  ON public.repair_evidence FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

-- Index for fast lookups
CREATE INDEX idx_repair_evidence_initiative ON public.repair_evidence(initiative_id);
CREATE INDEX idx_repair_evidence_org ON public.repair_evidence(organization_id);
