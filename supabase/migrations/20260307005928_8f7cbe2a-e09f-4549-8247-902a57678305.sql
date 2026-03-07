
-- Learning Records table for Sprint 10
CREATE TABLE public.learning_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  stage_name text NOT NULL DEFAULT '',
  learning_type text NOT NULL DEFAULT 'generation_outcome',
  source_type text NOT NULL DEFAULT 'stage_execution',
  source_id uuid,
  input_signature text,
  decision_taken text NOT NULL DEFAULT '',
  outcome_summary text NOT NULL DEFAULT '',
  success_signal numeric NOT NULL DEFAULT 0,
  failure_signal numeric NOT NULL DEFAULT 0,
  cost_signal numeric,
  time_signal integer,
  recommended_adjustment text,
  confidence_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_learning_records_org ON public.learning_records(organization_id);
CREATE INDEX idx_learning_records_initiative ON public.learning_records(initiative_id);
CREATE INDEX idx_learning_records_type ON public.learning_records(learning_type);
CREATE INDEX idx_learning_records_stage ON public.learning_records(stage_name);
CREATE INDEX idx_learning_records_created ON public.learning_records(created_at DESC);

-- RLS
ALTER TABLE public.learning_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view learning records"
  ON public.learning_records FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage learning records"
  ON public.learning_records FOR ALL
  TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));
