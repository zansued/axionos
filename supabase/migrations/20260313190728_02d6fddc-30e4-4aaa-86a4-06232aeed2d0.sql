
CREATE TABLE public.frontend_error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  stack text,
  severity text NOT NULL DEFAULT 'error',
  source text NOT NULL DEFAULT 'manual',
  route text,
  user_agent text,
  user_id uuid,
  organization_id uuid,
  component text,
  metadata jsonb DEFAULT '{}'::jsonb,
  reported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS needed — this is written only via service role from edge function
ALTER TABLE public.frontend_error_reports ENABLE ROW LEVEL SECURITY;

-- Index for querying by org + time
CREATE INDEX idx_frontend_errors_org_time ON public.frontend_error_reports (organization_id, created_at DESC);
CREATE INDEX idx_frontend_errors_severity ON public.frontend_error_reports (severity, created_at DESC);
