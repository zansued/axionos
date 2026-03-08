
-- Sprint 75: Role Arbitration & Capability Routing 2.0

-- Routing decisions
CREATE TABLE public.agent_routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  task_context JSONB NOT NULL DEFAULT '{}',
  pipeline_stage TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL DEFAULT 'general',
  chosen_agent_id UUID,
  chosen_capability TEXT NOT NULL DEFAULT '',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  risk_posture TEXT NOT NULL DEFAULT 'unknown',
  fallback_path JSONB NOT NULL DEFAULT '[]',
  routing_reason TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  policy_constraints_applied JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'decided',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_routing_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org routing decisions"
  ON public.agent_routing_decisions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own org routing decisions"
  ON public.agent_routing_decisions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own org routing decisions"
  ON public.agent_routing_decisions FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Candidate agents considered per routing decision
CREATE TABLE public.agent_routing_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.agent_routing_decisions(id) ON DELETE CASCADE,
  agent_id UUID,
  capability_key TEXT NOT NULL DEFAULT '',
  suitability_score NUMERIC NOT NULL DEFAULT 0,
  risk_score NUMERIC NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  selected BOOLEAN NOT NULL DEFAULT false,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_routing_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org routing candidates"
  ON public.agent_routing_candidates FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own org routing candidates"
  ON public.agent_routing_candidates FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Outcomes tracked per routing decision
CREATE TABLE public.agent_routing_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.agent_routing_decisions(id) ON DELETE CASCADE,
  outcome_status TEXT NOT NULL DEFAULT 'pending',
  success BOOLEAN,
  outcome_metrics JSONB NOT NULL DEFAULT '{}',
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  fallback_agent_id UUID,
  outcome_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_routing_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org routing outcomes"
  ON public.agent_routing_outcomes FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own org routing outcomes"
  ON public.agent_routing_outcomes FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Review events for bad routes or operator flags
CREATE TABLE public.agent_routing_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.agent_routing_decisions(id) ON DELETE CASCADE,
  reviewer_id UUID,
  event_type TEXT NOT NULL DEFAULT 'flag',
  review_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_routing_review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org routing reviews"
  ON public.agent_routing_review_events FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own org routing reviews"
  ON public.agent_routing_review_events FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
