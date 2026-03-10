
-- Sprint 121: Outcome-Based Autonomy Engine

CREATE TABLE public.autonomy_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  current_autonomy_level INTEGER NOT NULL DEFAULT 0,
  max_autonomy_level INTEGER NOT NULL DEFAULT 5,
  evidence_score NUMERIC NOT NULL DEFAULT 0,
  rollback_dependence_score NUMERIC NOT NULL DEFAULT 0,
  incident_penalty_score NUMERIC NOT NULL DEFAULT 0,
  validation_success_rate NUMERIC NOT NULL DEFAULT 0,
  doctrine_alignment_score NUMERIC NOT NULL DEFAULT 0,
  reversibility_posture TEXT NOT NULL DEFAULT 'full',
  allowed_action_classes JSONB NOT NULL DEFAULT '[]',
  blocked_action_classes JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.autonomy_ladders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.autonomy_domains(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0,
  level_name TEXT NOT NULL DEFAULT '',
  requirements JSONB NOT NULL DEFAULT '{}',
  granted_actions JSONB NOT NULL DEFAULT '[]',
  restricted_actions JSONB NOT NULL DEFAULT '[]',
  min_evidence_score NUMERIC NOT NULL DEFAULT 0,
  max_incident_rate NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.autonomy_evidence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.autonomy_domains(id) ON DELETE CASCADE,
  score_type TEXT NOT NULL DEFAULT 'composite',
  score_value NUMERIC NOT NULL DEFAULT 0,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  computation_details JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.autonomy_adjustment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.autonomy_domains(id) ON DELETE CASCADE,
  previous_level INTEGER NOT NULL DEFAULT 0,
  new_level INTEGER NOT NULL DEFAULT 0,
  adjustment_reason TEXT NOT NULL DEFAULT '',
  adjustment_type TEXT NOT NULL DEFAULT 'upgrade',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  adjusted_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.autonomy_regression_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.autonomy_domains(id) ON DELETE CASCADE,
  regression_type TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'low',
  trigger_event TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  resolution_status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE public.autonomy_guardrail_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.autonomy_domains(id) ON DELETE CASCADE,
  breach_type TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL DEFAULT '',
  action_attempted TEXT NOT NULL DEFAULT '',
  blocked BOOLEAN NOT NULL DEFAULT true,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.autonomy_review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.autonomy_domains(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL DEFAULT 'level_change',
  decision TEXT NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by TEXT,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE TABLE public.bounded_autoapproval_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_class TEXT NOT NULL DEFAULT '',
  min_autonomy_level INTEGER NOT NULL DEFAULT 3,
  max_risk_score NUMERIC NOT NULL DEFAULT 0.3,
  requires_rollback_posture BOOLEAN NOT NULL DEFAULT true,
  enabled BOOLEAN NOT NULL DEFAULT true,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.autonomy_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomy_ladders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomy_evidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomy_adjustment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomy_regression_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomy_guardrail_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomy_review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounded_autoapproval_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage autonomy_domains" ON public.autonomy_domains FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can manage autonomy_ladders" ON public.autonomy_ladders FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can manage autonomy_evidence_scores" ON public.autonomy_evidence_scores FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can manage autonomy_adjustment_events" ON public.autonomy_adjustment_events FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can manage autonomy_regression_cases" ON public.autonomy_regression_cases FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can manage autonomy_guardrail_breaches" ON public.autonomy_guardrail_breaches FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can manage autonomy_review_decisions" ON public.autonomy_review_decisions FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can manage bounded_autoapproval_classes" ON public.bounded_autoapproval_classes FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_autonomy_domains_org ON public.autonomy_domains(organization_id);
CREATE INDEX idx_autonomy_ladders_org ON public.autonomy_ladders(organization_id);
CREATE INDEX idx_autonomy_evidence_scores_org ON public.autonomy_evidence_scores(organization_id);
CREATE INDEX idx_autonomy_adjustment_events_org ON public.autonomy_adjustment_events(organization_id);
CREATE INDEX idx_autonomy_regression_cases_org ON public.autonomy_regression_cases(organization_id);
CREATE INDEX idx_autonomy_guardrail_breaches_org ON public.autonomy_guardrail_breaches(organization_id);
CREATE INDEX idx_autonomy_review_decisions_org ON public.autonomy_review_decisions(organization_id);
CREATE INDEX idx_bounded_autoapproval_classes_org ON public.bounded_autoapproval_classes(organization_id);
