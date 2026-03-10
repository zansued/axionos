
-- Learning Candidates table for Sprint 127 (Learning Extraction Engine)
CREATE TABLE public.learning_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_type TEXT NOT NULL DEFAULT 'execution_pattern',
  candidate_scope TEXT NOT NULL DEFAULT 'tenant_specific',
  pattern_signature TEXT NOT NULL DEFAULT '',
  evidence_count INTEGER NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0.0,
  first_observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_action TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.learning_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view learning candidates in their org"
  ON public.learning_candidates FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert learning candidates in their org"
  ON public.learning_candidates FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update learning candidates in their org"
  ON public.learning_candidates FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Service role full access for edge functions
CREATE POLICY "Service role full access on learning_candidates"
  ON public.learning_candidates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for org queries
CREATE INDEX idx_learning_candidates_org ON public.learning_candidates(organization_id);
CREATE INDEX idx_learning_candidates_status ON public.learning_candidates(status);
CREATE INDEX idx_learning_candidates_type ON public.learning_candidates(candidate_type);
