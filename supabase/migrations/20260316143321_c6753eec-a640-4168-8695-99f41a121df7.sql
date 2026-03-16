
CREATE TABLE public.pipeline_execution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  initiative_id UUID REFERENCES public.initiatives(id),
  subtask_id UUID REFERENCES public.story_subtasks(id),
  file_path TEXT NOT NULL DEFAULT '',
  file_type TEXT,
  wave_number INT NOT NULL DEFAULT 0,
  execution_path TEXT NOT NULL DEFAULT 'safe_3call',
  risk_tier TEXT NOT NULL DEFAULT 'medium',
  latency_ms INT NOT NULL DEFAULT 0,
  ai_calls INT NOT NULL DEFAULT 0,
  tokens_used INT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  integration_severity TEXT NOT NULL DEFAULT 'none',
  integration_edit_ratio NUMERIC(5,4) NOT NULL DEFAULT 0,
  output_size INT NOT NULL DEFAULT 0,
  retry_count INT NOT NULL DEFAULT 0,
  validation_passed BOOLEAN NOT NULL DEFAULT true,
  syntax_valid BOOLEAN NOT NULL DEFAULT true,
  import_resolution_ok BOOLEAN NOT NULL DEFAULT true,
  fast_path_reason TEXT NOT NULL DEFAULT '',
  error_message TEXT,
  error_category TEXT,
  succeeded BOOLEAN NOT NULL DEFAULT true,
  trace_id TEXT,
  attempt_id TEXT,
  duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pem_org_id ON public.pipeline_execution_metrics(organization_id);
CREATE INDEX idx_pem_initiative_id ON public.pipeline_execution_metrics(initiative_id);
CREATE INDEX idx_pem_created_at ON public.pipeline_execution_metrics(created_at DESC);
CREATE INDEX idx_pem_succeeded ON public.pipeline_execution_metrics(succeeded);
CREATE INDEX idx_pem_error_category ON public.pipeline_execution_metrics(error_category) WHERE error_category IS NOT NULL;

ALTER TABLE public.pipeline_execution_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on pipeline_execution_metrics"
  ON public.pipeline_execution_metrics FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read own org pipeline metrics"
  ON public.pipeline_execution_metrics FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
  ));
