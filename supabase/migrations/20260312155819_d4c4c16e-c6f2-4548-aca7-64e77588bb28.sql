
-- Knowledge Lineage Events: tracks every event in the lifecycle of a knowledge object
CREATE TABLE public.knowledge_lineage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  knowledge_object_type TEXT NOT NULL DEFAULT 'canon_entry',
  knowledge_object_id UUID NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'created',
  source_type TEXT,
  source_id UUID,
  related_object_type TEXT,
  related_object_id UUID,
  summary TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_lineage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view lineage events for their org"
  ON public.knowledge_lineage_events FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));
CREATE INDEX idx_lineage_events_org ON public.knowledge_lineage_events(organization_id);
CREATE INDEX idx_lineage_events_object ON public.knowledge_lineage_events(knowledge_object_type, knowledge_object_id);
CREATE INDEX idx_lineage_events_type ON public.knowledge_lineage_events(event_type);

-- Knowledge Provenance Links: directed links between knowledge objects
CREATE TABLE public.knowledge_provenance_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_object_type TEXT NOT NULL DEFAULT 'canon_entry',
  target_object_id UUID NOT NULL,
  source_object_type TEXT NOT NULL DEFAULT 'learning_candidate',
  source_object_id UUID NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'derived_from',
  weight NUMERIC NOT NULL DEFAULT 1.0,
  confidence_contribution NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_provenance_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view provenance links for their org"
  ON public.knowledge_provenance_links FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));
CREATE INDEX idx_provenance_links_org ON public.knowledge_provenance_links(organization_id);
CREATE INDEX idx_provenance_links_target ON public.knowledge_provenance_links(target_object_type, target_object_id);
CREATE INDEX idx_provenance_links_source ON public.knowledge_provenance_links(source_object_type, source_object_id);

-- Knowledge Confidence Breakdowns: explains confidence score composition
CREATE TABLE public.knowledge_confidence_breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  knowledge_object_type TEXT NOT NULL DEFAULT 'canon_entry',
  knowledge_object_id UUID NOT NULL,
  base_confidence NUMERIC NOT NULL DEFAULT 0.5,
  repo_trust_contribution NUMERIC NOT NULL DEFAULT 0,
  recurrence_contribution NUMERIC NOT NULL DEFAULT 0,
  execution_reinforcement NUMERIC NOT NULL DEFAULT 0,
  merge_support NUMERIC NOT NULL DEFAULT 0,
  negative_signal_penalty NUMERIC NOT NULL DEFAULT 0,
  final_confidence NUMERIC NOT NULL DEFAULT 0.5,
  explanation TEXT NOT NULL DEFAULT '',
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_confidence_breakdowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view confidence breakdowns for their org"
  ON public.knowledge_confidence_breakdowns FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));
CREATE INDEX idx_confidence_breakdowns_org ON public.knowledge_confidence_breakdowns(organization_id);
CREATE INDEX idx_confidence_breakdowns_object ON public.knowledge_confidence_breakdowns(knowledge_object_type, knowledge_object_id);
