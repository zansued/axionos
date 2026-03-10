
CREATE TABLE public.pattern_distillation_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pattern_signature TEXT NOT NULL DEFAULT '',
  tenant_occurrence_count INTEGER NOT NULL DEFAULT 0,
  stack_occurrence_count INTEGER NOT NULL DEFAULT 0,
  global_occurrence_count INTEGER NOT NULL DEFAULT 0,
  generalization_score NUMERIC NOT NULL DEFAULT 0,
  recommended_scope TEXT NOT NULL DEFAULT 'tenant_specific',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pattern_distillation_org ON public.pattern_distillation_records(organization_id);
CREATE INDEX idx_pattern_distillation_scope ON public.pattern_distillation_records(recommended_scope);

ALTER TABLE public.pattern_distillation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pattern_distillation_records in their org"
  ON public.pattern_distillation_records FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert pattern_distillation_records in their org"
  ON public.pattern_distillation_records FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update pattern_distillation_records in their org"
  ON public.pattern_distillation_records FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
