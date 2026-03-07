
-- Sprint 28: Execution Policy Portfolio Optimization

-- 1. Portfolio Entries
CREATE TABLE public.execution_policy_portfolio_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  execution_policy_profile_id uuid NOT NULL REFERENCES public.execution_policy_profiles(id),
  portfolio_group text NOT NULL DEFAULT 'default',
  context_classes jsonb NOT NULL DEFAULT '[]'::jsonb,
  portfolio_rank numeric NULL,
  usefulness_score numeric NULL,
  risk_score numeric NULL,
  cost_efficiency_score numeric NULL,
  quality_gain_score numeric NULL,
  speed_gain_score numeric NULL,
  stability_score numeric NULL,
  lifecycle_status text NOT NULL DEFAULT 'candidate',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Portfolio Recommendations
CREATE TABLE public.execution_policy_portfolio_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  recommendation_type text NOT NULL DEFAULT 'reprioritize',
  target_policy_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  context_scope jsonb NULL,
  recommendation_reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.execution_policy_portfolio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_policy_portfolio_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view portfolio entries"
  ON public.execution_policy_portfolio_entries FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage portfolio entries"
  ON public.execution_policy_portfolio_entries FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view portfolio recommendations"
  ON public.execution_policy_portfolio_recommendations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage portfolio recommendations"
  ON public.execution_policy_portfolio_recommendations FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_portfolio_entry_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lifecycle_status NOT IN ('candidate', 'active', 'watch', 'limited', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid lifecycle_status: %', NEW.lifecycle_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_portfolio_entry
  BEFORE INSERT OR UPDATE ON public.execution_policy_portfolio_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_portfolio_entry_status();

CREATE OR REPLACE FUNCTION public.validate_portfolio_recommendation()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.recommendation_type NOT IN ('promote', 'limit', 'deprecate', 'split', 'merge', 'reprioritize') THEN
    RAISE EXCEPTION 'Invalid recommendation_type: %', NEW.recommendation_type;
  END IF;
  IF NEW.status NOT IN ('open', 'reviewed', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid recommendation status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_portfolio_recommendation
  BEFORE INSERT OR UPDATE ON public.execution_policy_portfolio_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.validate_portfolio_recommendation();

-- Indexes
CREATE INDEX idx_portfolio_entries_org ON public.execution_policy_portfolio_entries(organization_id);
CREATE INDEX idx_portfolio_entries_policy ON public.execution_policy_portfolio_entries(execution_policy_profile_id);
CREATE INDEX idx_portfolio_entries_status ON public.execution_policy_portfolio_entries(lifecycle_status);
CREATE INDEX idx_portfolio_recommendations_org ON public.execution_policy_portfolio_recommendations(organization_id);
CREATE INDEX idx_portfolio_recommendations_status ON public.execution_policy_portfolio_recommendations(status);
