
-- Table for org-level usage limits and tracking
CREATE TABLE public.org_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  monthly_budget_usd numeric NOT NULL DEFAULT 50,
  alert_threshold_pct integer NOT NULL DEFAULT 80,
  hard_limit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE public.org_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view usage limits"
  ON public.org_usage_limits FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage usage limits"
  ON public.org_usage_limits FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role]));

CREATE TRIGGER update_org_usage_limits_updated_at
  BEFORE UPDATE ON public.org_usage_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monthly usage snapshots for historical tracking
CREATE TABLE public.usage_monthly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  total_jobs integer NOT NULL DEFAULT 0,
  total_cost_usd numeric NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  total_artifacts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, month_start)
);

ALTER TABLE public.usage_monthly_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view usage snapshots"
  ON public.usage_monthly_snapshots FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage usage snapshots"
  ON public.usage_monthly_snapshots FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role]));
