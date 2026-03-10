
CREATE TABLE public.operational_loops (
  loop_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_id TEXT NOT NULL DEFAULT 'global',
  loop_type TEXT NOT NULL DEFAULT 'execution',
  loop_status TEXT NOT NULL DEFAULT 'active',
  loop_priority NUMERIC NOT NULL DEFAULT 0.5,
  loop_health TEXT NOT NULL DEFAULT 'healthy',
  loop_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_loops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view operational loops"
  ON public.operational_loops FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert operational loops"
  ON public.operational_loops FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update operational loops"
  ON public.operational_loops FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );
