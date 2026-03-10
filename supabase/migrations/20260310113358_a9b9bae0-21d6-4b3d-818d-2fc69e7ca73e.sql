
-- Sprint 124: Autonomy Transition Stabilization

-- Transition rules table
CREATE TABLE public.autonomy_transition_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  level_from INTEGER NOT NULL,
  level_to INTEGER NOT NULL,
  minimum_time_at_level_hours INTEGER NOT NULL DEFAULT 24,
  minimum_execution_count INTEGER NOT NULL DEFAULT 10,
  confidence_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.85,
  tenant_override_allowed BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, level_from, level_to)
);

ALTER TABLE public.autonomy_transition_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_transition_rules" ON public.autonomy_transition_rules
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_manage_transition_rules" ON public.autonomy_transition_rules
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Transition attempt log for observability
CREATE TABLE public.autonomy_transition_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  domain_id UUID,
  level_from INTEGER NOT NULL,
  level_to INTEGER NOT NULL,
  direction TEXT NOT NULL DEFAULT 'upgrade',
  approved BOOLEAN NOT NULL DEFAULT false,
  rejection_reason TEXT,
  time_at_current_level_hours NUMERIC(10,2),
  execution_count_at_level INTEGER,
  confidence_score NUMERIC(4,3),
  rule_applied UUID REFERENCES public.autonomy_transition_rules(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.autonomy_transition_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_transition_attempts" ON public.autonomy_transition_attempts
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_members_insert_transition_attempts" ON public.autonomy_transition_attempts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_transition_rules_org ON public.autonomy_transition_rules(organization_id);
CREATE INDEX idx_transition_attempts_org ON public.autonomy_transition_attempts(organization_id);
CREATE INDEX idx_transition_attempts_domain ON public.autonomy_transition_attempts(domain_id);

-- Seed default transition rules (org_id NULL = system defaults)
INSERT INTO public.autonomy_transition_rules (organization_id, level_from, level_to, minimum_time_at_level_hours, minimum_execution_count, confidence_threshold, is_default) VALUES
  (NULL, 0, 1, 12, 5, 0.300, true),
  (NULL, 1, 2, 24, 10, 0.500, true),
  (NULL, 2, 3, 48, 15, 0.700, true),
  (NULL, 3, 4, 72, 25, 0.850, true),
  (NULL, 4, 5, 168, 50, 0.950, true);
