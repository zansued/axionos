
CREATE TABLE public.canon_learning_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.learning_candidates(id) ON DELETE SET NULL,
  promotion_stage TEXT NOT NULL DEFAULT 'draft',
  review_required BOOLEAN NOT NULL DEFAULT true,
  review_notes TEXT DEFAULT '',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  activated_at TIMESTAMP WITH TIME ZONE,
  deprecated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_canon_learning_records_org ON public.canon_learning_records(organization_id);
CREATE INDEX idx_canon_learning_records_stage ON public.canon_learning_records(promotion_stage);
CREATE INDEX idx_canon_learning_records_status ON public.canon_learning_records(approval_status);

ALTER TABLE public.canon_learning_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view canon_learning_records in their org"
  ON public.canon_learning_records FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert canon_learning_records in their org"
  ON public.canon_learning_records FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update canon_learning_records in their org"
  ON public.canon_learning_records FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
