
CREATE TABLE public.adaptive_routing_profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  posture_state TEXT NOT NULL DEFAULT 'stabilizing',
  attention_level TEXT NOT NULL DEFAULT 'medium',
  validation_depth TEXT NOT NULL DEFAULT 'standard',
  repair_priority TEXT NOT NULL DEFAULT 'normal',
  publish_threshold_modifier NUMERIC NOT NULL DEFAULT 0,
  domain_id TEXT NOT NULL DEFAULT '',
  adjustments_applied JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.adaptive_routing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view adaptive routing profiles"
  ON public.adaptive_routing_profiles FOR SELECT TO authenticated
  USING (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Org members can insert adaptive routing profiles"
  ON public.adaptive_routing_profiles FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Org members can update adaptive routing profiles"
  ON public.adaptive_routing_profiles FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()));
