
CREATE TABLE public.project_prevention_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  error_pattern text NOT NULL,
  prevention_rule text NOT NULL,
  scope text NOT NULL DEFAULT 'initiative',
  confidence_score numeric NOT NULL DEFAULT 0.5,
  times_triggered integer NOT NULL DEFAULT 1,
  last_triggered_at timestamptz NOT NULL DEFAULT now(),
  source_error_id uuid REFERENCES public.project_errors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_prevention_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors+ can manage prevention rules"
  ON public.project_prevention_rules
  FOR ALL
  TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

CREATE POLICY "Org members can view prevention rules"
  ON public.project_prevention_rules
  FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
