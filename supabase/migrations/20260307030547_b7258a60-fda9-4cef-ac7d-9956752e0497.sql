
-- Product Plans table
CREATE TABLE public.product_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  monthly_price_usd numeric NOT NULL DEFAULT 0,
  max_initiatives_per_month integer NOT NULL DEFAULT 20,
  max_tokens_per_month bigint NOT NULL DEFAULT 2000000,
  max_deployments_per_month integer NOT NULL DEFAULT 10,
  max_parallel_runs integer NOT NULL DEFAULT 2,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_plans ENABLE ROW LEVEL SECURITY;

-- Plans are readable by all authenticated users
CREATE POLICY "Authenticated users can view plans"
  ON public.product_plans FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can manage plans (no direct user management)
CREATE POLICY "Service role manages plans"
  ON public.product_plans FOR ALL
  USING (true)
  WITH CHECK (true);

-- Billing Accounts table
CREATE TABLE public.billing_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.product_plans(id),
  stripe_customer_id text,
  billing_email text,
  billing_status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  current_period_end timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view billing"
  ON public.billing_accounts FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage billing"
  ON public.billing_accounts FOR ALL
  TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Workspace Members table (granular workspace-level roles)
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view workspace members"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      WHERE is_org_member(auth.uid(), w.organization_id)
    )
  );

CREATE POLICY "Admins can manage workspace members"
  ON public.workspace_members FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      WHERE get_user_org_role(auth.uid(), w.organization_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      WHERE get_user_org_role(auth.uid(), w.organization_id) IN ('owner', 'admin')
    )
  );

-- Seed default plans
INSERT INTO public.product_plans (plan_name, monthly_price_usd, max_initiatives_per_month, max_tokens_per_month, max_deployments_per_month, max_parallel_runs, sort_order, features)
VALUES
  ('Starter', 29, 20, 2000000, 10, 2, 1, '["Pipeline determinístico", "Build repair básico", "Observabilidade", "1 workspace"]'::jsonb),
  ('Pro', 99, 100, 10000000, 50, 6, 2, '["Tudo do Starter", "Repair adaptativo", "Prevenção ativa", "Learning foundation", "Workspaces ilimitados", "Suporte prioritário"]'::jsonb),
  ('Enterprise', 0, 999999, 999999999, 999999, 20, 3, '["Tudo do Pro", "Tokens customizáveis", "SLA dedicado", "SSO", "Governança avançada", "Suporte premium"]'::jsonb);

-- Add is_active and created_by to workspaces if not present
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
