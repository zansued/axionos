
-- Table for artifact review comments / decision history
CREATE TABLE public.artifact_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  output_id UUID NOT NULL REFERENCES public.agent_outputs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submit_review', 'approve', 'reject', 'request_changes', 'deploy', 'comment')),
  comment TEXT,
  previous_status TEXT,
  new_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artifact_reviews ENABLE ROW LEVEL SECURITY;

-- Org members can view reviews
CREATE POLICY "Org members can view reviews"
ON public.artifact_reviews
FOR SELECT
USING (
  output_id IN (
    SELECT id FROM agent_outputs
    WHERE is_org_member(auth.uid(), organization_id)
  )
);

-- Editors+ can create reviews
CREATE POLICY "Editors+ can create reviews"
ON public.artifact_reviews
FOR INSERT
WITH CHECK (
  reviewer_id = auth.uid() AND
  output_id IN (
    SELECT id FROM agent_outputs
    WHERE get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role])
  )
);

-- Index for fast lookups
CREATE INDEX idx_artifact_reviews_output_id ON public.artifact_reviews(output_id);
CREATE INDEX idx_artifact_reviews_created_at ON public.artifact_reviews(created_at DESC);
