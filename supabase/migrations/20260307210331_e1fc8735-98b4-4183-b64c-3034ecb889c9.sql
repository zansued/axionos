
-- Sprint 33: Strategy Portfolio Governance

-- 1. Strategy Portfolios
CREATE TABLE public.strategy_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  portfolio_key text NOT NULL,
  portfolio_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, portfolio_key)
);

ALTER TABLE public.strategy_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_strategy_portfolios" ON public.strategy_portfolios FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_write_strategy_portfolios" ON public.strategy_portfolios FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. Strategy Portfolio Members
CREATE TABLE public.strategy_portfolio_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.strategy_portfolios(id) ON DELETE CASCADE,
  strategy_family_id uuid NOT NULL REFERENCES public.execution_strategy_families(id) ON DELETE CASCADE,
  lifecycle_status text NOT NULL DEFAULT 'proposed',
  exposure_weight numeric NOT NULL DEFAULT 1.0,
  performance_score numeric NULL,
  stability_score numeric NULL,
  cost_efficiency_score numeric NULL,
  last_evaluated_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, strategy_family_id)
);

ALTER TABLE public.strategy_portfolio_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_spm" ON public.strategy_portfolio_members FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_write_spm" ON public.strategy_portfolio_members FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. Strategy Portfolio Metrics
CREATE TABLE public.strategy_portfolio_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.strategy_portfolios(id) ON DELETE CASCADE,
  portfolio_success_rate numeric NOT NULL DEFAULT 0,
  portfolio_cost_efficiency numeric NOT NULL DEFAULT 0,
  portfolio_stability_index numeric NOT NULL DEFAULT 0,
  strategy_concentration_index numeric NOT NULL DEFAULT 0,
  portfolio_regression_rate numeric NOT NULL DEFAULT 0,
  member_count integer NOT NULL DEFAULT 0,
  active_count integer NOT NULL DEFAULT 0,
  degrading_count integer NOT NULL DEFAULT 0,
  snapshot_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_portfolio_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_sp_metrics" ON public.strategy_portfolio_metrics FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_write_sp_metrics" ON public.strategy_portfolio_metrics FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 4. Strategy Portfolio Conflicts
CREATE TABLE public.strategy_portfolio_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.strategy_portfolios(id) ON DELETE CASCADE,
  conflict_type text NOT NULL DEFAULT 'overlap',
  affected_strategy_ids jsonb NOT NULL DEFAULT '[]',
  severity text NOT NULL DEFAULT 'low',
  confidence numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  recommended_resolution text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  evidence_refs jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);

ALTER TABLE public.strategy_portfolio_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_sp_conflicts" ON public.strategy_portfolio_conflicts FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_write_sp_conflicts" ON public.strategy_portfolio_conflicts FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_strategy_portfolio_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'watch', 'frozen', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid strategy_portfolios status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_strategy_portfolio_status
  BEFORE INSERT OR UPDATE ON public.strategy_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.validate_strategy_portfolio_status();

CREATE OR REPLACE FUNCTION public.validate_strategy_portfolio_member()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lifecycle_status NOT IN ('proposed', 'experimental', 'active', 'degrading', 'deprecated', 'archived') THEN
    RAISE EXCEPTION 'Invalid lifecycle_status: %', NEW.lifecycle_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_strategy_portfolio_member
  BEFORE INSERT OR UPDATE ON public.strategy_portfolio_members
  FOR EACH ROW EXECUTE FUNCTION public.validate_strategy_portfolio_member();

CREATE OR REPLACE FUNCTION public.validate_strategy_portfolio_conflict()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.conflict_type NOT IN ('overlap', 'oscillation', 'mode_conflict', 'regression_correlation', 'exposure_imbalance') THEN
    RAISE EXCEPTION 'Invalid conflict_type: %', NEW.conflict_type;
  END IF;
  IF NEW.severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity: %', NEW.severity;
  END IF;
  IF NEW.status NOT IN ('open', 'reviewed', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid conflict status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_strategy_portfolio_conflict
  BEFORE INSERT OR UPDATE ON public.strategy_portfolio_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.validate_strategy_portfolio_conflict();

-- Indexes
CREATE INDEX idx_spm_portfolio ON public.strategy_portfolio_members(portfolio_id);
CREATE INDEX idx_spm_family ON public.strategy_portfolio_members(strategy_family_id);
CREATE INDEX idx_sp_metrics_portfolio ON public.strategy_portfolio_metrics(portfolio_id);
CREATE INDEX idx_sp_conflicts_portfolio ON public.strategy_portfolio_conflicts(portfolio_id);
CREATE INDEX idx_sp_conflicts_status ON public.strategy_portfolio_conflicts(status);

-- Updated_at triggers
CREATE TRIGGER update_strategy_portfolios_updated_at BEFORE UPDATE ON public.strategy_portfolios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_spm_updated_at BEFORE UPDATE ON public.strategy_portfolio_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
