
CREATE TABLE public.organism_memory (
  memory_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL DEFAULT 'episodic',
  memory_signature TEXT NOT NULL DEFAULT '',
  memory_scope TEXT NOT NULL DEFAULT 'organization',
  memory_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organism_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view organism memory"
  ON public.organism_memory FOR SELECT TO authenticated
  USING (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Org members can insert organism memory"
  ON public.organism_memory FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Org members can update organism memory"
  ON public.organism_memory FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
