
-- Sprint 17: Memory Summaries table
CREATE TABLE public.memory_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  summary_type text NOT NULL DEFAULT 'FAILURE_PATTERN_SUMMARY',
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  title text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_memory_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  entry_count integer NOT NULL DEFAULT 0,
  signal_strength numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_memory_summaries_org ON public.memory_summaries(organization_id);
CREATE INDEX idx_memory_summaries_workspace ON public.memory_summaries(workspace_id);
CREATE INDEX idx_memory_summaries_type ON public.memory_summaries(summary_type);
CREATE INDEX idx_memory_summaries_period_start ON public.memory_summaries(period_start);
CREATE INDEX idx_memory_summaries_period_end ON public.memory_summaries(period_end);
CREATE INDEX idx_memory_summaries_created ON public.memory_summaries(created_at);

-- Unique constraint to prevent duplicate summaries for same type+org+workspace+period
CREATE UNIQUE INDEX idx_memory_summaries_unique_period 
  ON public.memory_summaries(organization_id, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'), summary_type, period_start, period_end);

-- RLS
ALTER TABLE public.memory_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view summaries"
  ON public.memory_summaries FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can insert summaries"
  ON public.memory_summaries FOR INSERT
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

CREATE POLICY "Editors+ can update summaries"
  ON public.memory_summaries FOR UPDATE
  USING (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

CREATE POLICY "Admins can delete summaries"
  ON public.memory_summaries FOR DELETE
  USING (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role]));
