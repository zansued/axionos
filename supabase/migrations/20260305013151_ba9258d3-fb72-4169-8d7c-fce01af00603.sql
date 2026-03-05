
CREATE TABLE public.stage_sla_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stage text NOT NULL,
  max_hours integer NOT NULL DEFAULT 24,
  alert_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, stage)
);

ALTER TABLE public.stage_sla_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view SLA configs"
  ON public.stage_sla_configs FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage SLA configs"
  ON public.stage_sla_configs FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role]));
