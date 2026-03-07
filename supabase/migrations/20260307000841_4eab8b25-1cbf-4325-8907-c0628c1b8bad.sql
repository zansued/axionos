
-- Active Prevention Rules table — Sprint 8
CREATE TABLE public.active_prevention_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id uuid REFERENCES public.error_patterns(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_candidate_id uuid REFERENCES public.prevention_rule_candidates(id) ON DELETE SET NULL,
  rule_type text NOT NULL DEFAULT 'validation_rule',
  description text NOT NULL DEFAULT '',
  trigger_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  pipeline_stage text NOT NULL DEFAULT '*',
  action_type text NOT NULL DEFAULT 'warn',
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  times_triggered integer NOT NULL DEFAULT 0,
  times_prevented integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_active_prevention_rules_org ON public.active_prevention_rules(organization_id);
CREATE INDEX idx_active_prevention_rules_enabled ON public.active_prevention_rules(enabled);
CREATE INDEX idx_active_prevention_rules_stage ON public.active_prevention_rules(pipeline_stage);

-- Prevention Events log table
CREATE TABLE public.prevention_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.active_prevention_rules(id) ON DELETE CASCADE,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_stage text NOT NULL,
  action_taken text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  prevented boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prevention_events_org ON public.prevention_events(organization_id);
CREATE INDEX idx_prevention_events_rule ON public.prevention_events(rule_id);
CREATE INDEX idx_prevention_events_created ON public.prevention_events(created_at DESC);

-- RLS for active_prevention_rules
ALTER TABLE public.active_prevention_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors+ can manage prevention rules"
  ON public.active_prevention_rules FOR ALL TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Org members can view prevention rules"
  ON public.active_prevention_rules FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- RLS for prevention_events
ALTER TABLE public.prevention_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors+ can manage prevention events"
  ON public.prevention_events FOR ALL TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Org members can view prevention events"
  ON public.prevention_events FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
