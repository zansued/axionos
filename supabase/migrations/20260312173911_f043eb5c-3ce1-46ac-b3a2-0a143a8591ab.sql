
-- Sprint 189: Knowledge Acquisition Execution Orchestrator

CREATE TABLE public.knowledge_acquisition_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  plan_id UUID REFERENCES public.knowledge_acquisition_plans(id),
  source_ref TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'repo',
  execution_mode TEXT NOT NULL DEFAULT 'single_source',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'queued',
  estimated_cost NUMERIC NOT NULL DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  budget_status TEXT NOT NULL DEFAULT 'within_budget',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  candidates_generated INTEGER DEFAULT 0,
  items_absorbed INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  fail_reason TEXT,
  execution_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_acquisition_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org acquisition jobs"
  ON public.knowledge_acquisition_jobs FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert org acquisition jobs"
  ON public.knowledge_acquisition_jobs FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update org acquisition jobs"
  ON public.knowledge_acquisition_jobs FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.knowledge_acquisition_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  job_id UUID NOT NULL REFERENCES public.knowledge_acquisition_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_acquisition_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org acquisition events"
  ON public.knowledge_acquisition_events FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert org acquisition events"
  ON public.knowledge_acquisition_events FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
