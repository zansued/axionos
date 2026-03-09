
-- Pipeline Subjobs table for granular architecture stage orchestration
CREATE TABLE public.pipeline_subjobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.initiative_jobs(id) ON DELETE CASCADE NOT NULL,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  subjob_key TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'architecture',
  status TEXT NOT NULL DEFAULT 'queued',
  depends_on TEXT[] NOT NULL DEFAULT '{}',
  result JSONB,
  error TEXT,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, subjob_key)
);

ALTER TABLE public.pipeline_subjobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subjobs in their org"
  ON public.pipeline_subjobs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_pipeline_subjobs_job_id ON public.pipeline_subjobs(job_id);
CREATE INDEX idx_pipeline_subjobs_initiative ON public.pipeline_subjobs(initiative_id, stage);

CREATE TRIGGER update_pipeline_subjobs_updated_at
  BEFORE UPDATE ON public.pipeline_subjobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_subjobs;
