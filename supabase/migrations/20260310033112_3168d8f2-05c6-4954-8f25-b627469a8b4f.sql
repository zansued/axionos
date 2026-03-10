
-- Sprint 117: Failure Memory & Repair Intelligence Archive

CREATE TABLE public.failure_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signature TEXT NOT NULL DEFAULT '',
  failure_type TEXT NOT NULL DEFAULT 'unknown',
  stack_scope TEXT NOT NULL DEFAULT 'general',
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  affected_layers TEXT[] DEFAULT '{}',
  symptom_summary TEXT NOT NULL DEFAULT '',
  root_cause_hypothesis TEXT,
  proven_causes JSONB NOT NULL DEFAULT '[]',
  failed_repairs JSONB NOT NULL DEFAULT '[]',
  successful_repairs JSONB NOT NULL DEFAULT '[]',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  recurrence_score NUMERIC NOT NULL DEFAULT 0,
  containment_guidance TEXT,
  validation_requirements JSONB NOT NULL DEFAULT '[]',
  linked_canon_entries UUID[] DEFAULT '{}',
  lifecycle_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.failure_memory_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view failure_memory_entries" ON public.failure_memory_entries FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can insert failure_memory_entries" ON public.failure_memory_entries FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can update failure_memory_entries" ON public.failure_memory_entries FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_failure_memory_entries_org ON public.failure_memory_entries(organization_id);
CREATE INDEX idx_failure_memory_entries_sig ON public.failure_memory_entries(signature);

CREATE TABLE public.failure_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  raw_error TEXT NOT NULL DEFAULT '',
  normalized_signature TEXT NOT NULL DEFAULT '',
  normalization_method TEXT NOT NULL DEFAULT 'standard',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurrence_count INT NOT NULL DEFAULT 1,
  failure_memory_id UUID REFERENCES public.failure_memory_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.failure_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage failure_signatures" ON public.failure_signatures FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_failure_signatures_org ON public.failure_signatures(organization_id);
CREATE INDEX idx_failure_signatures_norm ON public.failure_signatures(normalized_signature);

CREATE TABLE public.failure_context_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  failure_memory_id UUID NOT NULL REFERENCES public.failure_memory_entries(id) ON DELETE CASCADE,
  pipeline_stage TEXT,
  initiative_id UUID,
  agent_type TEXT,
  stack_context JSONB NOT NULL DEFAULT '{}',
  environment_context JSONB NOT NULL DEFAULT '{}',
  error_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.failure_context_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage failure_context_snapshots" ON public.failure_context_snapshots FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_failure_context_snapshots_org ON public.failure_context_snapshots(organization_id);

CREATE TABLE public.repair_attempt_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  failure_memory_id UUID NOT NULL REFERENCES public.failure_memory_entries(id) ON DELETE CASCADE,
  repair_strategy TEXT NOT NULL DEFAULT 'unknown',
  repair_payload JSONB NOT NULL DEFAULT '{}',
  attempt_number INT NOT NULL DEFAULT 1,
  outcome TEXT NOT NULL DEFAULT 'pending',
  duration_ms INT,
  cost_estimate NUMERIC,
  agent_type TEXT,
  pipeline_stage TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_attempt_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage repair_attempt_records" ON public.repair_attempt_records FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_repair_attempt_records_org ON public.repair_attempt_records(organization_id);
CREATE INDEX idx_repair_attempt_records_failure ON public.repair_attempt_records(failure_memory_id);

CREATE TABLE public.repair_outcome_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  repair_attempt_id UUID NOT NULL REFERENCES public.repair_attempt_records(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL DEFAULT 'unknown',
  verification_method TEXT,
  regression_detected BOOLEAN NOT NULL DEFAULT false,
  regression_description TEXT,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_outcome_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage repair_outcome_links" ON public.repair_outcome_links FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_repair_outcome_links_org ON public.repair_outcome_links(organization_id);

CREATE TABLE public.mitigation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  failure_memory_id UUID NOT NULL REFERENCES public.failure_memory_entries(id) ON DELETE CASCADE,
  pattern_name TEXT NOT NULL DEFAULT '',
  pattern_description TEXT NOT NULL DEFAULT '',
  strategy_type TEXT NOT NULL DEFAULT 'unknown',
  success_rate NUMERIC NOT NULL DEFAULT 0,
  sample_size INT NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  applicability_conditions JSONB NOT NULL DEFAULT '{}',
  cautions TEXT[] DEFAULT '{}',
  lifecycle_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mitigation_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage mitigation_patterns" ON public.mitigation_patterns FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_mitigation_patterns_org ON public.mitigation_patterns(organization_id);

CREATE TABLE public.false_fix_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  failure_memory_id UUID NOT NULL REFERENCES public.failure_memory_entries(id) ON DELETE CASCADE,
  repair_attempt_id UUID REFERENCES public.repair_attempt_records(id),
  false_fix_type TEXT NOT NULL DEFAULT 'coincidental_recovery',
  description TEXT NOT NULL DEFAULT '',
  detection_method TEXT NOT NULL DEFAULT 'manual',
  danger_level TEXT NOT NULL DEFAULT 'low',
  recurrence_after_fix BOOLEAN NOT NULL DEFAULT false,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.false_fix_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage false_fix_records" ON public.false_fix_records FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_false_fix_records_org ON public.false_fix_records(organization_id);

CREATE TABLE public.repair_intelligence_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  failure_memory_id UUID NOT NULL REFERENCES public.failure_memory_entries(id) ON DELETE CASCADE,
  reviewer_id UUID,
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  confidence_adjustment NUMERIC,
  lifecycle_recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_intelligence_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage repair_intelligence_reviews" ON public.repair_intelligence_reviews FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_repair_intelligence_reviews_org ON public.repair_intelligence_reviews(organization_id);
