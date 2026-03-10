
-- Sprint 123: execution_validation_runs table
CREATE TABLE public.execution_validation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  stack_id TEXT NOT NULL DEFAULT 'default',
  execution_path TEXT NOT NULL DEFAULT 'idea→discovery→architecture→engineering→validation→publish',
  validation_success BOOLEAN NOT NULL DEFAULT false,
  rollback_triggered BOOLEAN NOT NULL DEFAULT false,
  guardrail_breach_attempts INTEGER NOT NULL DEFAULT 0,
  repair_actions INTEGER NOT NULL DEFAULT 0,
  repair_success BOOLEAN,
  repair_latency_ms INTEGER,
  execution_duration_ms INTEGER NOT NULL DEFAULT 0,
  execution_cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  publish_success BOOLEAN NOT NULL DEFAULT false,
  telemetry JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_validation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_harness_runs" ON public.execution_validation_runs
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_members_insert_harness_runs" ON public.execution_validation_runs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_exec_val_runs_org ON public.execution_validation_runs(organization_id);
CREATE INDEX idx_exec_val_runs_created ON public.execution_validation_runs(created_at);
