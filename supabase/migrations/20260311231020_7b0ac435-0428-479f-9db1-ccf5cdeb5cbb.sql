
-- Canon Evolution Proposals from Learning — Sprint 156
-- Table for learning-driven canon evolution proposals

CREATE TABLE IF NOT EXISTS public.canon_learning_evolution_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  proposal_type TEXT NOT NULL DEFAULT 'raise_review',
  target_type TEXT NOT NULL DEFAULT 'pattern',
  target_id TEXT,
  related_learning_signal_ids TEXT[] DEFAULT '{}',
  related_canon_entry_ids TEXT[] DEFAULT '{}',
  related_pattern_ids TEXT[] DEFAULT '{}',
  initiative_ids TEXT[] DEFAULT '{}',
  stage_scope TEXT DEFAULT '',
  evidence_summary TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'medium',
  recommendation TEXT NOT NULL DEFAULT '',
  review_status TEXT NOT NULL DEFAULT 'proposed',
  proposed_by_actor_type TEXT NOT NULL DEFAULT 'learning_feedback_loop',
  aggregation_key TEXT,
  aggregation_count INTEGER NOT NULL DEFAULT 1,
  routing_target TEXT DEFAULT 'governance_review_queue',
  routing_priority TEXT DEFAULT 'standard',
  reviewer_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canon_learning_evolution_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org learning evolution proposals"
  ON public.canon_learning_evolution_proposals FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert learning evolution proposals"
  ON public.canon_learning_evolution_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update learning evolution proposals"
  ON public.canon_learning_evolution_proposals FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_cle_proposals_org ON public.canon_learning_evolution_proposals(organization_id);
CREATE INDEX idx_cle_proposals_status ON public.canon_learning_evolution_proposals(review_status);
CREATE INDEX idx_cle_proposals_type ON public.canon_learning_evolution_proposals(proposal_type);
CREATE INDEX idx_cle_proposals_severity ON public.canon_learning_evolution_proposals(severity);
CREATE INDEX idx_cle_proposals_agg ON public.canon_learning_evolution_proposals(aggregation_key);
