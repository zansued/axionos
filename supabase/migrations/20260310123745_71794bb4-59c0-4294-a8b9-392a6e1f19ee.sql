
CREATE TABLE public.attention_allocation_map (
  allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_id TEXT NOT NULL DEFAULT '',
  attention_score NUMERIC NOT NULL DEFAULT 0,
  attention_reason TEXT NOT NULL DEFAULT '',
  signal_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attention_allocation_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view attention allocations"
  ON public.attention_allocation_map FOR SELECT TO authenticated
  USING (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Org members can insert attention allocations"
  ON public.attention_allocation_map FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Org members can update attention allocations"
  ON public.attention_allocation_map FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
