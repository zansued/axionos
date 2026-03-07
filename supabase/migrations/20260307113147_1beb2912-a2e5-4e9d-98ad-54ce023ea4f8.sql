
-- Sprint 14: Meta-Agent Artifacts table
CREATE TABLE public.meta_agent_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  recommendation_id uuid NOT NULL REFERENCES public.meta_agent_recommendations(id),
  artifact_type text NOT NULL DEFAULT 'ADR_DRAFT',
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by_meta_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  linked_resources jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Indexes
CREATE INDEX idx_meta_artifacts_org ON public.meta_agent_artifacts(organization_id);
CREATE INDEX idx_meta_artifacts_rec ON public.meta_agent_artifacts(recommendation_id);
CREATE INDEX idx_meta_artifacts_status ON public.meta_agent_artifacts(status);
CREATE UNIQUE INDEX idx_meta_artifacts_unique_rec ON public.meta_agent_artifacts(recommendation_id, artifact_type);

-- RLS
ALTER TABLE public.meta_agent_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view meta artifacts"
  ON public.meta_agent_artifacts FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage meta artifacts"
  ON public.meta_agent_artifacts FOR ALL
  TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));
