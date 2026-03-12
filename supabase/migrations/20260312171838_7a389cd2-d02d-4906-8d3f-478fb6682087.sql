
-- Sprint 187 & 188: Knowledge Demand Forecasting + Acquisition Planner

CREATE TABLE public.knowledge_demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  forecast_scope_type TEXT NOT NULL DEFAULT 'domain',
  forecast_scope_key TEXT NOT NULL DEFAULT '',
  forecast_score NUMERIC DEFAULT 0,
  forecast_confidence NUMERIC DEFAULT 0,
  demand_direction TEXT NOT NULL DEFAULT 'stable',
  forecast_window TEXT NOT NULL DEFAULT '30d',
  pressure_score NUMERIC DEFAULT 0,
  coverage_gap_score NUMERIC DEFAULT 0,
  primary_driver TEXT DEFAULT '',
  evidence_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_demand_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view demand forecasts" ON public.knowledge_demand_forecasts FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert demand forecasts" ON public.knowledge_demand_forecasts FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.knowledge_forecast_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL DEFAULT 'usage_trend',
  scope_type TEXT NOT NULL DEFAULT 'domain',
  scope_key TEXT NOT NULL DEFAULT '',
  signal_strength NUMERIC DEFAULT 0,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_forecast_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view forecast signals" ON public.knowledge_forecast_signals FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert forecast signals" ON public.knowledge_forecast_signals FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.knowledge_demand_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_type TEXT NOT NULL DEFAULT 'expand_domain_knowledge',
  target_scope_type TEXT NOT NULL DEFAULT 'domain',
  target_scope_key TEXT NOT NULL DEFAULT '',
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
ALTER TABLE public.knowledge_demand_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view demand proposals" ON public.knowledge_demand_proposals FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert demand proposals" ON public.knowledge_demand_proposals FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update demand proposals" ON public.knowledge_demand_proposals FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.knowledge_acquisition_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'repository',
  source_ref TEXT NOT NULL DEFAULT '',
  target_domain TEXT DEFAULT '',
  target_stack TEXT DEFAULT '',
  opportunity_score NUMERIC DEFAULT 0,
  expected_knowledge_gain NUMERIC DEFAULT 0,
  expected_cost NUMERIC DEFAULT 0,
  urgency_score NUMERIC DEFAULT 0,
  novelty_score NUMERIC DEFAULT 0,
  redundancy_risk NUMERIC DEFAULT 0,
  expected_downstream_value NUMERIC DEFAULT 0,
  evidence_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_acquisition_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view acquisition opportunities" ON public.knowledge_acquisition_opportunities FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert acquisition opportunities" ON public.knowledge_acquisition_opportunities FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.knowledge_acquisition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT '',
  target_scope TEXT NOT NULL DEFAULT '',
  source_refs JSONB DEFAULT '[]',
  strategy_mode TEXT NOT NULL DEFAULT 'targeted',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'proposed',
  expected_cost NUMERIC DEFAULT 0,
  expected_benefit NUMERIC DEFAULT 0,
  confidence NUMERIC DEFAULT 0,
  rationale TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_acquisition_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view acquisition plans" ON public.knowledge_acquisition_plans FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert acquisition plans" ON public.knowledge_acquisition_plans FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update acquisition plans" ON public.knowledge_acquisition_plans FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.knowledge_acquisition_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  budget_type TEXT NOT NULL DEFAULT 'tokens',
  budget_limit NUMERIC NOT NULL DEFAULT 0,
  budget_used NUMERIC NOT NULL DEFAULT 0,
  budget_window TEXT NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_acquisition_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view acquisition budgets" ON public.knowledge_acquisition_budgets FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert acquisition budgets" ON public.knowledge_acquisition_budgets FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update acquisition budgets" ON public.knowledge_acquisition_budgets FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE INDEX idx_demand_forecasts_org ON public.knowledge_demand_forecasts(organization_id, created_at DESC);
CREATE INDEX idx_forecast_signals_org ON public.knowledge_forecast_signals(organization_id, created_at DESC);
CREATE INDEX idx_demand_proposals_org ON public.knowledge_demand_proposals(organization_id, status);
CREATE INDEX idx_acquisition_opps_org ON public.knowledge_acquisition_opportunities(organization_id, opportunity_score DESC);
CREATE INDEX idx_acquisition_plans_org ON public.knowledge_acquisition_plans(organization_id, status);
CREATE INDEX idx_acquisition_budgets_org ON public.knowledge_acquisition_budgets(organization_id);
