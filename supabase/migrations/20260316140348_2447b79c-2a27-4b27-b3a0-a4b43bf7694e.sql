
-- Sprint 207: Confidence Recalibration Runs tracking
CREATE TABLE public.confidence_recalibration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL DEFAULT 'scheduled',
  entries_evaluated INTEGER NOT NULL DEFAULT 0,
  entries_recalibrated INTEGER NOT NULL DEFAULT 0,
  entries_boosted INTEGER NOT NULL DEFAULT 0,
  entries_degraded INTEGER NOT NULL DEFAULT 0,
  avg_delta NUMERIC(6,4) DEFAULT 0,
  max_delta NUMERIC(6,4) DEFAULT 0,
  feedback_signals_used INTEGER NOT NULL DEFAULT 0,
  run_duration_ms INTEGER DEFAULT 0,
  summary JSONB DEFAULT '{}',
  triggered_by TEXT NOT NULL DEFAULT 'cron',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.confidence_recalibration_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recalibration runs for their org"
  ON public.confidence_recalibration_runs FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_recalibration_runs_org ON public.confidence_recalibration_runs(organization_id);
CREATE INDEX idx_recalibration_runs_created ON public.confidence_recalibration_runs(created_at DESC);
