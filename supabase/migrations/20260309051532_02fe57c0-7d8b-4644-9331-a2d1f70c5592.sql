
-- Sprint 98: Institutional Decision Engine
-- Block T: Governed Intelligence OS — Completion

-- ─── Enums ────────────────────────────────────────────────────────────
CREATE TYPE public.decision_class AS ENUM (
  'governance_recommendation',
  'routing_decision_support',
  'capability_activation_posture',
  'benchmark_escalation',
  'intervention_recommendation',
  'bounded_autonomy_decision',
  'promotion_guidance',
  'delivery_readiness'
);

CREATE TYPE public.decision_status AS ENUM (
  'draft',
  'pending',
  'accepted',
  'rejected',
  'deferred',
  'escalated',
  'archived'
);

CREATE TYPE public.confidence_posture AS ENUM (
  'very_low',
  'low',
  'moderate',
  'high',
  'very_high'
);

CREATE TYPE public.approval_posture AS ENUM (
  'advisory_only',
  'suggested_approval',
  'requires_review',
  'requires_approval',
  'escalate_to_admin'
);

-- ─── institutional_decisions ──────────────────────────────────────────
CREATE TABLE public.institutional_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  decision_key TEXT NOT NULL DEFAULT '',
  decision_title TEXT NOT NULL DEFAULT '',
  decision_description TEXT NOT NULL DEFAULT '',
  decision_class public.decision_class NOT NULL DEFAULT 'governance_recommendation',
  decision_context JSONB NOT NULL DEFAULT '{}',
  recommendation TEXT NOT NULL DEFAULT '',
  recommendation_rationale TEXT NOT NULL DEFAULT '',
  confidence_posture public.confidence_posture NOT NULL DEFAULT 'moderate',
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  uncertainty_notes TEXT,
  risk_posture TEXT NOT NULL DEFAULT 'low',
  risk_score NUMERIC NOT NULL DEFAULT 0.1,
  approval_posture public.approval_posture NOT NULL DEFAULT 'advisory_only',
  status public.decision_status NOT NULL DEFAULT 'pending',
  contributing_memory_count INTEGER NOT NULL DEFAULT 0,
  contributing_doctrine_count INTEGER NOT NULL DEFAULT 0,
  trade_offs JSONB NOT NULL DEFAULT '[]',
  escalation_reason TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

ALTER TABLE public.institutional_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view institutional decisions"
  ON public.institutional_decisions FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can manage institutional decisions"
  ON public.institutional_decisions FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- ─── decision_signal_links ────────────────────────────────────────────
CREATE TABLE public.decision_signal_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.institutional_decisions(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL DEFAULT 'memory',
  signal_source_id UUID,
  signal_source_table TEXT,
  contribution_weight NUMERIC NOT NULL DEFAULT 0.5,
  signal_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_signal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view decision signals"
  ON public.decision_signal_links FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can manage decision signals"
  ON public.decision_signal_links FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- ─── decision_reviews ─────────────────────────────────────────────────
CREATE TABLE public.decision_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.institutional_decisions(id) ON DELETE CASCADE,
  reviewer_id UUID,
  review_action TEXT NOT NULL DEFAULT 'comment',
  review_notes TEXT NOT NULL DEFAULT '',
  outcome_alignment NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view decision reviews"
  ON public.decision_reviews FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can manage decision reviews"
  ON public.decision_reviews FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- ─── decision_explanations ────────────────────────────────────────────
CREATE TABLE public.decision_explanations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.institutional_decisions(id) ON DELETE CASCADE,
  explanation_type TEXT NOT NULL DEFAULT 'full',
  explanation_content JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view decision explanations"
  ON public.decision_explanations FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can manage decision explanations"
  ON public.decision_explanations FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Indexes
CREATE INDEX idx_inst_decisions_org ON public.institutional_decisions(organization_id);
CREATE INDEX idx_inst_decisions_status ON public.institutional_decisions(status);
CREATE INDEX idx_inst_decisions_class ON public.institutional_decisions(decision_class);
CREATE INDEX idx_inst_decisions_confidence ON public.institutional_decisions(confidence_posture);
CREATE INDEX idx_decision_signals_decision ON public.decision_signal_links(decision_id);
CREATE INDEX idx_decision_reviews_decision ON public.decision_reviews(decision_id);
CREATE INDEX idx_decision_explanations_decision ON public.decision_explanations(decision_id);
