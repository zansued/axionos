
-- Sprint 20: Advisory Calibration Layer tables

-- advisory_calibration_signals
CREATE TABLE public.advisory_calibration_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  calibration_domain text NOT NULL DEFAULT '',
  target_component text NOT NULL DEFAULT '',
  signal_type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  signal_strength numeric NOT NULL DEFAULT 0,
  confidence_score numeric NOT NULL DEFAULT 0,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_action text NOT NULL DEFAULT '',
  risk_of_overcorrection numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_acs_org ON public.advisory_calibration_signals(organization_id);
CREATE INDEX idx_acs_ws ON public.advisory_calibration_signals(workspace_id);
CREATE INDEX idx_acs_domain ON public.advisory_calibration_signals(calibration_domain);
CREATE INDEX idx_acs_target ON public.advisory_calibration_signals(target_component);
CREATE INDEX idx_acs_signal ON public.advisory_calibration_signals(signal_type);
CREATE INDEX idx_acs_created ON public.advisory_calibration_signals(created_at);

ALTER TABLE public.advisory_calibration_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors+ can manage calibration signals"
  ON public.advisory_calibration_signals FOR ALL
  TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','editor'));

CREATE POLICY "Org members can view calibration signals"
  ON public.advisory_calibration_signals FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- advisory_calibration_summaries
CREATE TABLE public.advisory_calibration_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  summary_type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  signal_count integer NOT NULL DEFAULT 0,
  strongest_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_acsum_org ON public.advisory_calibration_summaries(organization_id);
CREATE INDEX idx_acsum_type ON public.advisory_calibration_summaries(summary_type);
CREATE INDEX idx_acsum_created ON public.advisory_calibration_summaries(created_at);

ALTER TABLE public.advisory_calibration_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors+ can manage calibration summaries"
  ON public.advisory_calibration_summaries FOR ALL
  TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','editor'));

CREATE POLICY "Org members can view calibration summaries"
  ON public.advisory_calibration_summaries FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
