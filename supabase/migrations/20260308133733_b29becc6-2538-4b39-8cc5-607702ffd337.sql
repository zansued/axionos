
-- Sprint 55: Product Opportunity Portfolio Governance

-- 1. product_opportunity_portfolios
CREATE TABLE public.product_opportunity_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  portfolio_name text NOT NULL DEFAULT '',
  portfolio_scope_type text NOT NULL DEFAULT 'organization',
  portfolio_scope_id text,
  lifecycle_status text NOT NULL DEFAULT 'active',
  portfolio_balance_score numeric DEFAULT 0,
  total_items integer DEFAULT 0,
  promoted_count integer DEFAULT 0,
  deferred_count integer DEFAULT 0,
  rejected_count integer DEFAULT 0,
  monitored_count integer DEFAULT 0,
  evidence_links jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_opportunity_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_opp_portfolios" ON public.product_opportunity_portfolios FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_opp_portfolios" ON public.product_opportunity_portfolios FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_opp_portfolios" ON public.product_opportunity_portfolios FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_opp_portfolio_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lifecycle_status NOT IN ('draft','active','watch','frozen','deprecated','archived') THEN
    RAISE EXCEPTION 'Invalid lifecycle_status: %', NEW.lifecycle_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_opp_portfolio_status BEFORE INSERT OR UPDATE ON public.product_opportunity_portfolios FOR EACH ROW EXECUTE FUNCTION public.validate_opp_portfolio_status();

-- 2. product_opportunity_portfolio_items
CREATE TABLE public.product_opportunity_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  portfolio_id uuid NOT NULL REFERENCES public.product_opportunity_portfolios(id),
  opportunity_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_benchmark_id uuid,
  linked_recommendation_id uuid,
  linked_architecture_correlation_id uuid,
  linked_profile_correlation_id uuid,
  strategic_fit_score numeric DEFAULT 0,
  expected_value_score numeric DEFAULT 0,
  confidence_score numeric DEFAULT 0,
  feasibility_score numeric DEFAULT 0,
  capacity_pressure_score numeric DEFAULT 0,
  portfolio_priority_score numeric DEFAULT 0,
  conflict_score numeric DEFAULT 0,
  overlap_score numeric DEFAULT 0,
  cannibalization_score numeric DEFAULT 0,
  promotion_readiness_score numeric DEFAULT 0,
  deferral_justification_score numeric DEFAULT 0,
  watchlist_relevance_score numeric DEFAULT 0,
  governance_state text NOT NULL DEFAULT 'candidate',
  evidence_links jsonb DEFAULT '[]'::jsonb,
  assumptions jsonb DEFAULT '{}'::jsonb,
  rationale text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_opportunity_portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_opp_items" ON public.product_opportunity_portfolio_items FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_opp_items" ON public.product_opportunity_portfolio_items FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_opp_items" ON public.product_opportunity_portfolio_items FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_opp_item_state() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.governance_state NOT IN ('candidate','ranked','promoted','deferred','rejected','monitor','split','merge_candidate','archived') THEN
    RAISE EXCEPTION 'Invalid governance_state: %', NEW.governance_state;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_opp_item_state BEFORE INSERT OR UPDATE ON public.product_opportunity_portfolio_items FOR EACH ROW EXECUTE FUNCTION public.validate_opp_item_state();

-- 3. product_opportunity_conflicts
CREATE TABLE public.product_opportunity_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  portfolio_id uuid REFERENCES public.product_opportunity_portfolios(id),
  conflict_type text NOT NULL DEFAULT 'overlap',
  affected_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  severity text NOT NULL DEFAULT 'medium',
  confidence_score numeric DEFAULT 0,
  overlap_score numeric DEFAULT 0,
  cannibalization_score numeric DEFAULT 0,
  recommended_resolution text DEFAULT '',
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  evidence_links jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_opportunity_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_opp_conflicts" ON public.product_opportunity_conflicts FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_opp_conflicts" ON public.product_opportunity_conflicts FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_opp_conflicts" ON public.product_opportunity_conflicts FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_opp_conflict() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.conflict_type NOT IN ('overlap','cannibalization','sequencing_tension','scope_collision','resource_contention') THEN
    RAISE EXCEPTION 'Invalid conflict_type: %', NEW.conflict_type;
  END IF;
  IF NEW.severity NOT IN ('low','medium','high','critical') THEN
    RAISE EXCEPTION 'Invalid severity: %', NEW.severity;
  END IF;
  IF NEW.status NOT IN ('open','reviewed','resolved','dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_opp_conflict BEFORE INSERT OR UPDATE ON public.product_opportunity_conflicts FOR EACH ROW EXECUTE FUNCTION public.validate_opp_conflict();

-- 4. product_opportunity_decisions
CREATE TABLE public.product_opportunity_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  portfolio_id uuid REFERENCES public.product_opportunity_portfolios(id),
  item_id uuid REFERENCES public.product_opportunity_portfolio_items(id),
  decision_type text NOT NULL DEFAULT 'promote',
  decision_status text NOT NULL DEFAULT 'pending',
  rationale text DEFAULT '',
  evidence_links jsonb DEFAULT '[]'::jsonb,
  reviewer_ref jsonb,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_opportunity_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_opp_decisions" ON public.product_opportunity_decisions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_opp_decisions" ON public.product_opportunity_decisions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_opp_decisions" ON public.product_opportunity_decisions FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_opp_decision() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.decision_type NOT IN ('promote','defer','reject','monitor','split','merge_candidate') THEN
    RAISE EXCEPTION 'Invalid decision_type: %', NEW.decision_type;
  END IF;
  IF NEW.decision_status NOT IN ('pending','approved','rejected','deferred','rolled_back') THEN
    RAISE EXCEPTION 'Invalid decision_status: %', NEW.decision_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_opp_decision BEFORE INSERT OR UPDATE ON public.product_opportunity_decisions FOR EACH ROW EXECUTE FUNCTION public.validate_opp_decision();

-- 5. product_opportunity_capacity_models
CREATE TABLE public.product_opportunity_capacity_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  capacity_scope text NOT NULL DEFAULT 'organization',
  max_concurrent_promotions integer DEFAULT 3,
  current_active_count integer DEFAULT 0,
  queue_pressure_score numeric DEFAULT 0,
  resource_utilization_score numeric DEFAULT 0,
  capacity_headroom_score numeric DEFAULT 0,
  assumptions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_opportunity_capacity_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_opp_capacity" ON public.product_opportunity_capacity_models FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_opp_capacity" ON public.product_opportunity_capacity_models FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_opp_capacity" ON public.product_opportunity_capacity_models FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 6. product_opportunity_outcomes
CREATE TABLE public.product_opportunity_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  portfolio_id uuid REFERENCES public.product_opportunity_portfolios(id),
  item_id uuid REFERENCES public.product_opportunity_portfolio_items(id),
  decision_id uuid REFERENCES public.product_opportunity_decisions(id),
  outcome_status text NOT NULL DEFAULT 'pending',
  expected_outcomes jsonb DEFAULT '{}'::jsonb,
  realized_outcomes jsonb DEFAULT '{}'::jsonb,
  portfolio_decision_quality_score numeric DEFAULT 0,
  portfolio_outcome_accuracy_score numeric DEFAULT 0,
  false_positive_flag boolean DEFAULT false,
  evidence_links jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_opportunity_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_opp_outcomes" ON public.product_opportunity_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_opp_outcomes" ON public.product_opportunity_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_opp_outcomes" ON public.product_opportunity_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_opp_outcome() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_opp_outcome BEFORE INSERT OR UPDATE ON public.product_opportunity_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_opp_outcome();
