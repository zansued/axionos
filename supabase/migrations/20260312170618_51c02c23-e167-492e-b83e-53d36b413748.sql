
-- Sprint 186: Knowledge Portfolio Optimization Engine

-- Portfolio snapshots
CREATE TABLE public.knowledge_portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  portfolio_score NUMERIC DEFAULT 0,
  coverage_score NUMERIC DEFAULT 0,
  redundancy_score NUMERIC DEFAULT 0,
  balance_score NUMERIC DEFAULT 0,
  source_diversity_score NUMERIC DEFAULT 0,
  stale_ratio NUMERIC DEFAULT 0,
  total_objects INTEGER DEFAULT 0,
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view portfolio snapshots"
  ON public.knowledge_portfolio_snapshots FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can insert portfolio snapshots"
  ON public.knowledge_portfolio_snapshots FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Portfolio segments
CREATE TABLE public.knowledge_portfolio_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.knowledge_portfolio_snapshots(id) ON DELETE CASCADE,
  segment_type TEXT NOT NULL DEFAULT 'domain',
  segment_key TEXT NOT NULL DEFAULT '',
  object_count INTEGER DEFAULT 0,
  coverage_score NUMERIC DEFAULT 0,
  redundancy_score NUMERIC DEFAULT 0,
  usage_score NUMERIC DEFAULT 0,
  health_score NUMERIC DEFAULT 0,
  avg_confidence NUMERIC DEFAULT 0,
  stale_count INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_portfolio_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view portfolio segments"
  ON public.knowledge_portfolio_segments FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can insert portfolio segments"
  ON public.knowledge_portfolio_segments FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Optimization proposals
CREATE TABLE public.knowledge_optimization_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.knowledge_portfolio_snapshots(id) ON DELETE SET NULL,
  proposal_type TEXT NOT NULL DEFAULT 'general',
  target_scope TEXT NOT NULL DEFAULT '',
  target_object_ids JSONB DEFAULT '[]',
  reason TEXT NOT NULL DEFAULT '',
  evidence_summary JSONB DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_optimization_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view optimization proposals"
  ON public.knowledge_optimization_proposals FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can insert optimization proposals"
  ON public.knowledge_optimization_proposals FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can update optimization proposals"
  ON public.knowledge_optimization_proposals FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_portfolio_snapshots_org ON public.knowledge_portfolio_snapshots(organization_id, created_at DESC);
CREATE INDEX idx_portfolio_segments_snapshot ON public.knowledge_portfolio_segments(snapshot_id);
CREATE INDEX idx_portfolio_segments_org ON public.knowledge_portfolio_segments(organization_id);
CREATE INDEX idx_optimization_proposals_org ON public.knowledge_optimization_proposals(organization_id, status);
