
-- Sprint 13: Meta-Agent Recommendations table
CREATE TABLE public.meta_agent_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  meta_agent_type text NOT NULL DEFAULT 'ARCHITECTURE_META_AGENT',
  recommendation_type text NOT NULL DEFAULT 'PIPELINE_OPTIMIZATION',
  target_component text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  confidence_score numeric NOT NULL DEFAULT 0,
  impact_score numeric NOT NULL DEFAULT 0,
  priority_score numeric NOT NULL DEFAULT 0,
  supporting_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_record_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  status text NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  recommendation_signature text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.meta_agent_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view meta recommendations"
  ON public.meta_agent_recommendations
  FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage meta recommendations"
  ON public.meta_agent_recommendations
  FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

-- Index for deduplication
CREATE INDEX idx_meta_recommendations_signature ON public.meta_agent_recommendations(organization_id, recommendation_signature) WHERE recommendation_signature IS NOT NULL;
CREATE INDEX idx_meta_recommendations_status ON public.meta_agent_recommendations(organization_id, status);
