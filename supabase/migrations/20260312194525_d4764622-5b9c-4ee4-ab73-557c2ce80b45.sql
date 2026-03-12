
-- Canon Poisoning Assessments: risk scoring for candidates
CREATE TABLE public.canon_poisoning_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_id UUID,
  source_id UUID,
  candidate_title TEXT DEFAULT '',
  source_name TEXT DEFAULT '',
  poisoning_risk_score NUMERIC NOT NULL DEFAULT 0,
  poisoning_risk_level TEXT NOT NULL DEFAULT 'none',
  poisoning_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_reason_summary TEXT NOT NULL DEFAULT '',
  requires_security_review BOOLEAN NOT NULL DEFAULT false,
  quarantine_status TEXT NOT NULL DEFAULT 'none',
  review_outcome TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canon_poisoning_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view poisoning assessments"
  ON public.canon_poisoning_assessments FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE INDEX idx_poisoning_assessments_org ON public.canon_poisoning_assessments(organization_id);
CREATE INDEX idx_poisoning_assessments_risk ON public.canon_poisoning_assessments(poisoning_risk_level);
CREATE INDEX idx_poisoning_assessments_quarantine ON public.canon_poisoning_assessments(quarantine_status);

-- Canon Security Signals: persisted signals linked to candidates/sources
CREATE TABLE public.canon_security_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL DEFAULT 'unknown',
  severity TEXT NOT NULL DEFAULT 'medium',
  candidate_id UUID,
  source_id UUID,
  assessment_id UUID REFERENCES public.canon_poisoning_assessments(id),
  description TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canon_security_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view security signals"
  ON public.canon_security_signals FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE INDEX idx_security_signals_org ON public.canon_security_signals(organization_id);
CREATE INDEX idx_security_signals_type ON public.canon_security_signals(signal_type);
