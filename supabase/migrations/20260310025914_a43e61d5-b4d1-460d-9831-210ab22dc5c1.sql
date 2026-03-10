
-- Sprint 113: Reflective Validation & Self-Revision Audit

-- Enums
CREATE TYPE public.revision_origin_type AS ENUM (
  'validation_fix_loop', 'calibration_adjustment', 'stabilization_action',
  'repair_intervention', 'rollback_event', 'parameter_tuning',
  'governance_correction', 'operator_override'
);

CREATE TYPE public.revision_audit_status AS ENUM (
  'pending', 'validating', 'validated', 'disputed', 'reviewed', 'closed'
);

-- 1. self_revision_events
CREATE TABLE public.self_revision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  origin_type public.revision_origin_type NOT NULL DEFAULT 'validation_fix_loop',
  linked_evolution_proposal_id UUID REFERENCES public.evolution_proposals(id),
  linked_mutation_case_id UUID REFERENCES public.architectural_mutation_cases(id),
  revision_scope TEXT NOT NULL DEFAULT '',
  affected_runtime_surfaces TEXT[] NOT NULL DEFAULT '{}',
  intended_outcome TEXT NOT NULL DEFAULT '',
  observed_outcome TEXT DEFAULT NULL,
  trigger_evidence JSONB NOT NULL DEFAULT '{}',
  audit_status public.revision_audit_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.self_revision_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_revision_events" ON public.self_revision_events FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_revision_events" ON public.self_revision_events FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_revision_events" ON public.self_revision_events FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_revision_events_org ON public.self_revision_events(organization_id);
CREATE INDEX idx_revision_events_status ON public.self_revision_events(audit_status);

-- 2. self_revision_validation_runs
CREATE TABLE public.self_revision_validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  revision_event_id UUID NOT NULL REFERENCES public.self_revision_events(id) ON DELETE CASCADE,
  local_improvement_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  displacement_risk_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  regression_probability NUMERIC(5,4) NOT NULL DEFAULT 0,
  net_effectiveness_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  comparison_details JSONB NOT NULL DEFAULT '{}',
  rationale TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.self_revision_validation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_validation_runs" ON public.self_revision_validation_runs FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_validation_runs" ON public.self_revision_validation_runs FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_validation_runs_revision ON public.self_revision_validation_runs(revision_event_id);

-- 3. self_revision_displacement_signals
CREATE TABLE public.self_revision_displacement_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  revision_event_id UUID NOT NULL REFERENCES public.self_revision_events(id) ON DELETE CASCADE,
  displaced_surface TEXT NOT NULL DEFAULT '',
  displacement_type TEXT NOT NULL DEFAULT 'unknown',
  severity NUMERIC(5,4) NOT NULL DEFAULT 0,
  evidence_refs JSONB NOT NULL DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.self_revision_displacement_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_displacement" ON public.self_revision_displacement_signals FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_displacement" ON public.self_revision_displacement_signals FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_displacement_revision ON public.self_revision_displacement_signals(revision_event_id);

-- 4. self_revision_effectiveness_scores
CREATE TABLE public.self_revision_effectiveness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  revision_event_id UUID NOT NULL REFERENCES public.self_revision_events(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL DEFAULT '',
  before_value NUMERIC NOT NULL DEFAULT 0,
  after_value NUMERIC NOT NULL DEFAULT 0,
  delta NUMERIC NOT NULL DEFAULT 0,
  improvement_flag BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.self_revision_effectiveness_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_effectiveness" ON public.self_revision_effectiveness_scores FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_effectiveness" ON public.self_revision_effectiveness_scores FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_effectiveness_revision ON public.self_revision_effectiveness_scores(revision_event_id);

-- 5. self_revision_regression_links
CREATE TABLE public.self_revision_regression_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  revision_event_id UUID NOT NULL REFERENCES public.self_revision_events(id) ON DELETE CASCADE,
  linked_revision_event_id UUID REFERENCES public.self_revision_events(id),
  regression_type TEXT NOT NULL DEFAULT 'unknown',
  regression_description TEXT NOT NULL DEFAULT '',
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
  evidence_refs JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.self_revision_regression_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_regression_links" ON public.self_revision_regression_links FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_regression_links" ON public.self_revision_regression_links FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_regression_revision ON public.self_revision_regression_links(revision_event_id);

-- 6. self_revision_audit_reviews
CREATE TABLE public.self_revision_audit_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  revision_event_id UUID NOT NULL REFERENCES public.self_revision_events(id) ON DELETE CASCADE,
  reviewer_id UUID,
  review_verdict TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT NOT NULL DEFAULT '',
  effectiveness_accepted BOOLEAN NOT NULL DEFAULT false,
  displacement_acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.self_revision_audit_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_audit_reviews" ON public.self_revision_audit_reviews FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_audit_reviews" ON public.self_revision_audit_reviews FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_audit_reviews_revision ON public.self_revision_audit_reviews(revision_event_id);
