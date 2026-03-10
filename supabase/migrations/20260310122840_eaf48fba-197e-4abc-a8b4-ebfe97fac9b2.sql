
CREATE TABLE public.operational_posture_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT '',
  stack_id TEXT NOT NULL DEFAULT '',
  current_posture TEXT NOT NULL DEFAULT 'observation_heavy',
  posture_confidence NUMERIC NOT NULL DEFAULT 0,
  trigger_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_operational_posture_org ON public.operational_posture_state(organization_id);
CREATE INDEX idx_operational_posture_posture ON public.operational_posture_state(current_posture);

ALTER TABLE public.operational_posture_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view operational_posture_state in their org"
  ON public.operational_posture_state FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert operational_posture_state in their org"
  ON public.operational_posture_state FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update operational_posture_state in their org"
  ON public.operational_posture_state FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
