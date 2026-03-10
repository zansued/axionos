
CREATE TABLE public.system_health_metrics (
  metric_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL DEFAULT 'resilience',
  metric_value NUMERIC NOT NULL DEFAULT 0,
  metric_trend TEXT NOT NULL DEFAULT 'stable',
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view system health metrics"
  ON public.system_health_metrics FOR SELECT TO authenticated
  USING (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Org members can insert system health metrics"
  ON public.system_health_metrics FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Org members can update system health metrics"
  ON public.system_health_metrics FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
