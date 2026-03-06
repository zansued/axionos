
-- Error Patterns table — Sprint 7
CREATE TABLE public.error_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  error_category text NOT NULL DEFAULT 'unknown_error',
  error_signature text NOT NULL DEFAULT '',
  normalized_signature text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  frequency integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  affected_stages text[] DEFAULT '{}'::text[],
  affected_file_types text[] DEFAULT '{}'::text[],
  common_causes text[] DEFAULT '{}'::text[],
  successful_strategies text[] DEFAULT '{}'::text[],
  failed_strategies text[] DEFAULT '{}'::text[],
  success_rate numeric NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'medium',
  repairability text NOT NULL DEFAULT 'unknown',
  recommended_prevention text,
  confidence_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_patterns_org ON public.error_patterns(organization_id);
CREATE INDEX idx_error_patterns_category ON public.error_patterns(error_category);
CREATE INDEX idx_error_patterns_normalized ON public.error_patterns(normalized_signature);
CREATE INDEX idx_error_patterns_frequency ON public.error_patterns(frequency DESC);
CREATE INDEX idx_error_patterns_last_seen ON public.error_patterns(last_seen_at DESC);

ALTER TABLE public.error_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors+ can manage error patterns"
  ON public.error_patterns FOR ALL TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Org members can view error patterns"
  ON public.error_patterns FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Strategy Effectiveness table — Sprint 7
CREATE TABLE public.strategy_effectiveness (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  error_category text NOT NULL,
  repair_strategy text NOT NULL,
  attempts_total integer NOT NULL DEFAULT 0,
  successes_total integer NOT NULL DEFAULT 0,
  failures_total integer NOT NULL DEFAULT 0,
  success_rate numeric NOT NULL DEFAULT 0,
  average_duration_ms integer NOT NULL DEFAULT 0,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  confidence_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, error_category, repair_strategy)
);

ALTER TABLE public.strategy_effectiveness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors+ can manage strategy effectiveness"
  ON public.strategy_effectiveness FOR ALL TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Org members can view strategy effectiveness"
  ON public.strategy_effectiveness FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Prevention Rule Candidates table — Sprint 7
CREATE TABLE public.prevention_rule_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pattern_id uuid REFERENCES public.error_patterns(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'validation_rule',
  description text NOT NULL DEFAULT '',
  proposed_action text NOT NULL DEFAULT '',
  expected_impact text NOT NULL DEFAULT '',
  confidence_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prevention_rule_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors+ can manage prevention candidates"
  ON public.prevention_rule_candidates FOR ALL TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Org members can view prevention candidates"
  ON public.prevention_rule_candidates FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
