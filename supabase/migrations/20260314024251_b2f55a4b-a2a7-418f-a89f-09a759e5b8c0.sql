-- Canon Revalidation Workflows
CREATE TABLE IF NOT EXISTS public.canon_revalidation_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  canon_entry_id uuid NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
  trigger_type text NOT NULL DEFAULT 'age_decay',
  trigger_reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  revalidation_result text,
  confidence_before numeric,
  confidence_after numeric,
  reviewed_by uuid,
  review_notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.canon_revalidation_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view revalidation workflows"
  ON public.canon_revalidation_workflows FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert revalidation workflows"
  ON public.canon_revalidation_workflows FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update revalidation workflows"
  ON public.canon_revalidation_workflows FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Canon Renewal Triggers
CREATE TABLE IF NOT EXISTS public.canon_renewal_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  canon_entry_id uuid NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
  trigger_type text NOT NULL DEFAULT 'confidence_decay',
  trigger_condition jsonb NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'low',
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_action text,
  workflow_id uuid REFERENCES public.canon_revalidation_workflows(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.canon_renewal_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view renewal triggers"
  ON public.canon_renewal_triggers FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert renewal triggers"
  ON public.canon_renewal_triggers FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update renewal triggers"
  ON public.canon_renewal_triggers FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));