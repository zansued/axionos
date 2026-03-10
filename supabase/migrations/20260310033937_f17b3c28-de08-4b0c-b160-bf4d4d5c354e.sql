
-- Sprint 118: External Knowledge Intake & Canon Evolution Control

-- External knowledge sources
CREATE TABLE public.external_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  source_name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'community',
  source_url TEXT DEFAULT '',
  reliability_score NUMERIC NOT NULL DEFAULT 50,
  last_evaluated_at TIMESTAMPTZ,
  evaluation_notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.external_knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage external knowledge sources" ON public.external_knowledge_sources FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- External knowledge candidates
CREATE TABLE public.external_knowledge_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  source_id UUID REFERENCES public.external_knowledge_sources(id),
  source_type TEXT NOT NULL DEFAULT 'community',
  source_reference TEXT DEFAULT '',
  source_reliability_score NUMERIC NOT NULL DEFAULT 50,
  knowledge_type TEXT NOT NULL DEFAULT 'pattern',
  title TEXT NOT NULL DEFAULT '',
  summary TEXT DEFAULT '',
  body TEXT DEFAULT '',
  claimed_applicability TEXT DEFAULT '',
  stack_scope TEXT DEFAULT '',
  novelty_score NUMERIC NOT NULL DEFAULT 0,
  conflict_with_existing_canon BOOLEAN NOT NULL DEFAULT false,
  internal_validation_status TEXT NOT NULL DEFAULT 'pending',
  trial_status TEXT NOT NULL DEFAULT 'none',
  promotion_status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT DEFAULT '',
  supersession_effect TEXT DEFAULT '',
  audit_notes TEXT DEFAULT '',
  submitted_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.external_knowledge_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage external knowledge candidates" ON public.external_knowledge_candidates FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- External knowledge reviews
CREATE TABLE public.external_knowledge_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  candidate_id UUID NOT NULL REFERENCES public.external_knowledge_candidates(id),
  reviewer_id TEXT DEFAULT '',
  verdict TEXT NOT NULL DEFAULT 'pending',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  conflict_detected BOOLEAN NOT NULL DEFAULT false,
  conflict_details TEXT DEFAULT '',
  review_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.external_knowledge_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage external knowledge reviews" ON public.external_knowledge_reviews FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Canon evolution proposals
CREATE TABLE public.canon_evolution_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  candidate_id UUID REFERENCES public.external_knowledge_candidates(id),
  proposal_type TEXT NOT NULL DEFAULT 'addition',
  target_canon_entry_id UUID,
  title TEXT NOT NULL DEFAULT '',
  justification TEXT DEFAULT '',
  expected_impact TEXT DEFAULT '',
  risk_assessment TEXT DEFAULT '',
  supersession_plan TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  proposed_by TEXT DEFAULT '',
  reviewed_by TEXT DEFAULT '',
  decision_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_evolution_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage canon evolution proposals" ON public.canon_evolution_proposals FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Canon change trials
CREATE TABLE public.canon_change_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  proposal_id UUID NOT NULL REFERENCES public.canon_evolution_proposals(id),
  candidate_id UUID REFERENCES public.external_knowledge_candidates(id),
  trial_scope TEXT DEFAULT '',
  trial_duration_days INTEGER NOT NULL DEFAULT 14,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  success_criteria TEXT DEFAULT '',
  outcome_summary TEXT DEFAULT '',
  outcome_metrics JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_change_trials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage canon change trials" ON public.canon_change_trials FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Canon promotion decisions
CREATE TABLE public.canon_promotion_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  proposal_id UUID NOT NULL REFERENCES public.canon_evolution_proposals(id),
  candidate_id UUID REFERENCES public.external_knowledge_candidates(id),
  trial_id UUID REFERENCES public.canon_change_trials(id),
  decision TEXT NOT NULL DEFAULT 'pending',
  decision_reason TEXT DEFAULT '',
  promoted_canon_entry_id UUID,
  superseded_canon_entry_id UUID,
  decided_by TEXT DEFAULT '',
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_promotion_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage canon promotion decisions" ON public.canon_promotion_decisions FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Canon external conflicts
CREATE TABLE public.canon_external_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  candidate_id UUID NOT NULL REFERENCES public.external_knowledge_candidates(id),
  existing_canon_entry_id UUID,
  conflict_type TEXT NOT NULL DEFAULT 'contradiction',
  conflict_description TEXT DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  resolution_status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT DEFAULT '',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.canon_external_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage canon external conflicts" ON public.canon_external_conflicts FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Canon evolution audit
CREATE TABLE public.canon_evolution_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  event_type TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL DEFAULT '',
  target_id UUID,
  actor TEXT DEFAULT '',
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_evolution_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read canon evolution audit" ON public.canon_evolution_audit FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can insert canon evolution audit" ON public.canon_evolution_audit FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_ext_knowledge_candidates_org ON public.external_knowledge_candidates(organization_id);
CREATE INDEX idx_ext_knowledge_candidates_status ON public.external_knowledge_candidates(promotion_status);
CREATE INDEX idx_ext_knowledge_reviews_candidate ON public.external_knowledge_reviews(candidate_id);
CREATE INDEX idx_canon_evolution_proposals_org ON public.canon_evolution_proposals(organization_id);
CREATE INDEX idx_canon_change_trials_proposal ON public.canon_change_trials(proposal_id);
CREATE INDEX idx_canon_promotion_decisions_proposal ON public.canon_promotion_decisions(proposal_id);
CREATE INDEX idx_canon_external_conflicts_candidate ON public.canon_external_conflicts(candidate_id);
CREATE INDEX idx_canon_evolution_audit_org ON public.canon_evolution_audit(organization_id);
