
CREATE TABLE public.operational_cycles (
  cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cycle_type TEXT NOT NULL DEFAULT 'stabilization_window',
  cycle_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  cycle_end TIMESTAMPTZ,
  active_posture TEXT NOT NULL DEFAULT 'stabilizing',
  cycle_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view operational cycles"
  ON public.operational_cycles FOR SELECT TO authenticated
  USING (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Org members can insert operational cycles"
  ON public.operational_cycles FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Org members can update operational cycles"
  ON public.operational_cycles FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
