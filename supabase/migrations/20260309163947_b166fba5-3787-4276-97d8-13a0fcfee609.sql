
-- Sprint 108: Institutional Tradeoff Arbitration System

-- 1. tradeoff_constitutions
CREATE TABLE public.tradeoff_constitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_code text NOT NULL DEFAULT '',
  constitution_name text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'organization',
  status text NOT NULL DEFAULT 'draft',
  tradeoff_principles text NOT NULL DEFAULT '',
  arbitration_defaults jsonb NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tradeoff_constitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view tradeoff_constitutions" ON public.tradeoff_constitutions FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can insert tradeoff_constitutions" ON public.tradeoff_constitutions FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can update tradeoff_constitutions" ON public.tradeoff_constitutions FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_tradeoff_constitutions_org ON public.tradeoff_constitutions(organization_id);
CREATE INDEX idx_tradeoff_constitutions_status ON public.tradeoff_constitutions(status);

-- 2. tradeoff_dimensions
CREATE TABLE public.tradeoff_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dimension_code text NOT NULL DEFAULT '',
  dimension_name text NOT NULL DEFAULT '',
  dimension_type text NOT NULL DEFAULT 'general',
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tradeoff_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view tradeoff_dimensions" ON public.tradeoff_dimensions FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can insert tradeoff_dimensions" ON public.tradeoff_dimensions FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_tradeoff_dimensions_org ON public.tradeoff_dimensions(organization_id);

-- 3. tradeoff_subjects
CREATE TABLE public.tradeoff_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_code text NOT NULL DEFAULT '',
  subject_type text NOT NULL DEFAULT 'decision',
  subject_ref jsonb NOT NULL DEFAULT '{}',
  domain text NOT NULL DEFAULT 'general',
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tradeoff_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view tradeoff_subjects" ON public.tradeoff_subjects FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can insert tradeoff_subjects" ON public.tradeoff_subjects FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_tradeoff_subjects_org ON public.tradeoff_subjects(organization_id);
CREATE INDEX idx_tradeoff_subjects_active ON public.tradeoff_subjects(organization_id, active);

-- 4. tradeoff_evaluations
CREATE TABLE public.tradeoff_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_id uuid REFERENCES public.tradeoff_constitutions(id),
  subject_id uuid NOT NULL REFERENCES public.tradeoff_subjects(id) ON DELETE CASCADE,
  gain_dimensions jsonb NOT NULL DEFAULT '[]',
  sacrifice_dimensions jsonb NOT NULL DEFAULT '[]',
  reversibility_score numeric NOT NULL DEFAULT 0,
  compromise_risk_score numeric NOT NULL DEFAULT 0,
  legitimacy_tension_score numeric NOT NULL DEFAULT 0,
  arbitration_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tradeoff_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view tradeoff_evaluations" ON public.tradeoff_evaluations FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can insert tradeoff_evaluations" ON public.tradeoff_evaluations FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_tradeoff_evaluations_org ON public.tradeoff_evaluations(organization_id);
CREATE INDEX idx_tradeoff_evaluations_subject ON public.tradeoff_evaluations(subject_id);

-- 5. tradeoff_arbitration_events
CREATE TABLE public.tradeoff_arbitration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.tradeoff_subjects(id) ON DELETE CASCADE,
  arbitration_type text NOT NULL DEFAULT 'tension',
  severity text NOT NULL DEFAULT 'medium',
  affected_dimensions jsonb NOT NULL DEFAULT '[]',
  event_summary text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.tradeoff_arbitration_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view tradeoff_arbitration_events" ON public.tradeoff_arbitration_events FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can insert tradeoff_arbitration_events" ON public.tradeoff_arbitration_events FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_tradeoff_arbitration_events_org ON public.tradeoff_arbitration_events(organization_id);
CREATE INDEX idx_tradeoff_arbitration_events_unresolved ON public.tradeoff_arbitration_events(organization_id) WHERE resolved_at IS NULL;

-- 6. tradeoff_recommendations
CREATE TABLE public.tradeoff_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.tradeoff_subjects(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL DEFAULT 'rebalance',
  recommendation_summary text NOT NULL DEFAULT '',
  preserved_values jsonb NOT NULL DEFAULT '[]',
  sacrificed_values jsonb NOT NULL DEFAULT '[]',
  rationale text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tradeoff_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view tradeoff_recommendations" ON public.tradeoff_recommendations FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can insert tradeoff_recommendations" ON public.tradeoff_recommendations FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_tradeoff_recommendations_org ON public.tradeoff_recommendations(organization_id);
CREATE INDEX idx_tradeoff_recommendations_active ON public.tradeoff_recommendations(organization_id, active);
