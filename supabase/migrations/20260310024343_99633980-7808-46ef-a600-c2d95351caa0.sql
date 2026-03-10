
-- Sprint 111 — Evolution Proposal Governance Engine

-- Proposal types enum
CREATE TYPE public.evolution_proposal_type AS ENUM (
  'operational_fix',
  'tactical_improvement',
  'architectural_evolution',
  'existential_change'
);

-- Proposal status enum
CREATE TYPE public.evolution_proposal_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'deferred',
  'archived'
);

-- Reversibility posture enum
CREATE TYPE public.reversibility_posture AS ENUM (
  'fully_reversible',
  'partially_reversible',
  'irreversible'
);

-- Boundedness posture enum
CREATE TYPE public.boundedness_posture AS ENUM (
  'strictly_bounded',
  'loosely_bounded',
  'unbounded'
);

-- Target layer enum
CREATE TYPE public.evolution_target_layer AS ENUM (
  'execution',
  'coordination',
  'governance',
  'strategic',
  'reflexive',
  'canonical_knowledge',
  'cross_layer'
);

-- 1. evolution_proposals
CREATE TABLE public.evolution_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_type public.evolution_proposal_type NOT NULL DEFAULT 'operational_fix',
  target_layer public.evolution_target_layer NOT NULL DEFAULT 'execution',
  target_scope TEXT NOT NULL DEFAULT '',
  problem_statement TEXT NOT NULL DEFAULT '',
  triggering_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  justification_summary TEXT NOT NULL DEFAULT '',
  expected_benefit TEXT NOT NULL DEFAULT '',
  complexity_cost NUMERIC NOT NULL DEFAULT 0,
  reversibility_posture public.reversibility_posture NOT NULL DEFAULT 'fully_reversible',
  boundedness_posture public.boundedness_posture NOT NULL DEFAULT 'strictly_bounded',
  kernel_touch_risk NUMERIC NOT NULL DEFAULT 0,
  mission_alignment_score NUMERIC NOT NULL DEFAULT 0,
  legitimacy_score NUMERIC NOT NULL DEFAULT 0,
  status public.evolution_proposal_status NOT NULL DEFAULT 'draft',
  proposed_by TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  approved_by TEXT,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evolution_proposals_org ON public.evolution_proposals(organization_id);
CREATE INDEX idx_evolution_proposals_status ON public.evolution_proposals(status);
CREATE INDEX idx_evolution_proposals_type ON public.evolution_proposals(proposal_type);

ALTER TABLE public.evolution_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view proposals"
  ON public.evolution_proposals FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert proposals"
  ON public.evolution_proposals FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update proposals"
  ON public.evolution_proposals FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 2. evolution_proposal_evidence
CREATE TABLE public.evolution_proposal_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.evolution_proposals(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'signal',
  evidence_source TEXT NOT NULL DEFAULT '',
  evidence_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  relevance_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evolution_evidence_proposal ON public.evolution_proposal_evidence(proposal_id);
CREATE INDEX idx_evolution_evidence_org ON public.evolution_proposal_evidence(organization_id);

ALTER TABLE public.evolution_proposal_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view evidence"
  ON public.evolution_proposal_evidence FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert evidence"
  ON public.evolution_proposal_evidence FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 3. evolution_proposal_reviews
CREATE TABLE public.evolution_proposal_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.evolution_proposals(id) ON DELETE CASCADE,
  reviewer_ref JSONB,
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  review_reason_codes JSONB,
  legitimacy_assessment JSONB,
  boundedness_assessment JSONB,
  reversibility_assessment JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evolution_reviews_proposal ON public.evolution_proposal_reviews(proposal_id);
CREATE INDEX idx_evolution_reviews_org ON public.evolution_proposal_reviews(organization_id);

ALTER TABLE public.evolution_proposal_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view reviews"
  ON public.evolution_proposal_reviews FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert reviews"
  ON public.evolution_proposal_reviews FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 4. evolution_proposal_decisions
CREATE TABLE public.evolution_proposal_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.evolution_proposals(id) ON DELETE CASCADE,
  decision TEXT NOT NULL DEFAULT 'pending',
  decision_rationale TEXT,
  decided_by TEXT,
  risk_accepted BOOLEAN NOT NULL DEFAULT false,
  conditions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evolution_decisions_proposal ON public.evolution_proposal_decisions(proposal_id);
CREATE INDEX idx_evolution_decisions_org ON public.evolution_proposal_decisions(organization_id);

ALTER TABLE public.evolution_proposal_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view decisions"
  ON public.evolution_proposal_decisions FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert decisions"
  ON public.evolution_proposal_decisions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 5. evolution_proposal_rollout_readiness
CREATE TABLE public.evolution_proposal_rollout_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.evolution_proposals(id) ON DELETE CASCADE,
  readiness_score NUMERIC NOT NULL DEFAULT 0,
  readiness_level TEXT NOT NULL DEFAULT 'not_ready',
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  prerequisites_met BOOLEAN NOT NULL DEFAULT false,
  rollback_plan_exists BOOLEAN NOT NULL DEFAULT false,
  impact_assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evolution_readiness_proposal ON public.evolution_proposal_rollout_readiness(proposal_id);
CREATE INDEX idx_evolution_readiness_org ON public.evolution_proposal_rollout_readiness(organization_id);

ALTER TABLE public.evolution_proposal_rollout_readiness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view readiness"
  ON public.evolution_proposal_rollout_readiness FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert readiness"
  ON public.evolution_proposal_rollout_readiness FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update readiness"
  ON public.evolution_proposal_rollout_readiness FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));
