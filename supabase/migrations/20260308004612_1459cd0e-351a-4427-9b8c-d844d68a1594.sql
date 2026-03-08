
-- Sprint 43: Architecture Portfolio Governance

-- 1. Architecture Portfolios
CREATE TABLE public.architecture_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  portfolio_key text NOT NULL,
  portfolio_name text NOT NULL,
  portfolio_scope text NOT NULL DEFAULT 'organization',
  portfolio_theme text NOT NULL DEFAULT '',
  portfolio_constraints jsonb NOT NULL DEFAULT '{}',
  lifecycle_status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, portfolio_key)
);

ALTER TABLE public.architecture_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_arch_portfolios" ON public.architecture_portfolios FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_arch_portfolios" ON public.architecture_portfolios FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_arch_portfolios" ON public.architecture_portfolios FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_architecture_portfolio_status() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lifecycle_status NOT IN ('draft','active','watch','constrained','deprecated','archived') THEN RAISE EXCEPTION 'Invalid lifecycle_status: %', NEW.lifecycle_status; END IF;
  IF NEW.portfolio_scope NOT IN ('global','organization','workspace','context_class') THEN RAISE EXCEPTION 'Invalid portfolio_scope: %', NEW.portfolio_scope; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_arch_portfolio BEFORE INSERT OR UPDATE ON public.architecture_portfolios FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_portfolio_status();

-- 2. Architecture Portfolio Members
CREATE TABLE public.architecture_portfolio_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  portfolio_id uuid NOT NULL REFERENCES public.architecture_portfolios(id),
  member_type text NOT NULL DEFAULT 'recommendation',
  member_ref jsonb NOT NULL DEFAULT '{}',
  contribution_score numeric,
  conflict_risk_score numeric,
  blast_radius_weight numeric,
  lifecycle_state text NOT NULL DEFAULT 'candidate',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_portfolio_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_arch_port_members" ON public.architecture_portfolio_members FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_arch_port_members" ON public.architecture_portfolio_members FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_arch_port_members" ON public.architecture_portfolio_members FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_architecture_portfolio_member() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.member_type NOT IN ('recommendation','simulation','plan','sandbox','pilot','migration') THEN RAISE EXCEPTION 'Invalid member_type: %', NEW.member_type; END IF;
  IF NEW.lifecycle_state NOT IN ('candidate','active','paused','conflicting','deprecated','archived') THEN RAISE EXCEPTION 'Invalid lifecycle_state: %', NEW.lifecycle_state; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_arch_port_member BEFORE INSERT OR UPDATE ON public.architecture_portfolio_members FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_portfolio_member();

-- 3. Architecture Portfolio Recommendations
CREATE TABLE public.architecture_portfolio_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  portfolio_id uuid NOT NULL REFERENCES public.architecture_portfolios(id),
  recommendation_type text NOT NULL DEFAULT 'defer',
  target_members jsonb NOT NULL DEFAULT '[]',
  recommendation_reason jsonb NOT NULL DEFAULT '{}',
  confidence_score numeric,
  priority_score numeric,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_portfolio_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_arch_port_recs" ON public.architecture_portfolio_recommendations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_arch_port_recs" ON public.architecture_portfolio_recommendations FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_arch_port_recs" ON public.architecture_portfolio_recommendations FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_architecture_portfolio_recommendation() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','reviewed','accepted','rejected','dismissed') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_arch_port_rec BEFORE INSERT OR UPDATE ON public.architecture_portfolio_recommendations FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_portfolio_recommendation();
