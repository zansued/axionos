
CREATE TABLE public.canon_reuse_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  canon_record_id UUID REFERENCES public.canon_learning_records(id) ON DELETE SET NULL,
  affected_stage TEXT NOT NULL DEFAULT 'engineering',
  reuse_type TEXT NOT NULL DEFAULT 'execution_guideline',
  activation_status TEXT NOT NULL DEFAULT 'advisory',
  times_applied INTEGER NOT NULL DEFAULT 0,
  last_applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_canon_reuse_org ON public.canon_reuse_registry(organization_id);
CREATE INDEX idx_canon_reuse_stage ON public.canon_reuse_registry(affected_stage);
CREATE INDEX idx_canon_reuse_status ON public.canon_reuse_registry(activation_status);

ALTER TABLE public.canon_reuse_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view canon_reuse_registry in their org"
  ON public.canon_reuse_registry FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert canon_reuse_registry in their org"
  ON public.canon_reuse_registry FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update canon_reuse_registry in their org"
  ON public.canon_reuse_registry FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
