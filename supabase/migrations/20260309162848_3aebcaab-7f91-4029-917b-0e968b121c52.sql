
-- Sprint 107: Multi-Horizon Strategic Alignment Engine

-- 1. Strategic Horizon Constitutions
CREATE TABLE public.strategic_horizon_constitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_code TEXT NOT NULL DEFAULT 'default',
  constitution_name TEXT NOT NULL DEFAULT 'Default Horizon Constitution',
  scope TEXT NOT NULL DEFAULT 'organization',
  status TEXT NOT NULL DEFAULT 'draft',
  horizon_principles TEXT NOT NULL DEFAULT '',
  default_horizon_weights JSONB NOT NULL DEFAULT '{"short_term":0.25,"medium_term":0.30,"long_term":0.25,"mission_continuity":0.20}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_horizon_constitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_horizon_constitutions" ON public.strategic_horizon_constitutions FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_shc_org ON public.strategic_horizon_constitutions(organization_id);

-- 2. Strategic Horizons
CREATE TABLE public.strategic_horizons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  horizon_code TEXT NOT NULL DEFAULT 'short_term',
  horizon_name TEXT NOT NULL DEFAULT 'Short Term',
  horizon_type TEXT NOT NULL DEFAULT 'short_term',
  default_timeframe TEXT NOT NULL DEFAULT '0-3 months',
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_horizons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_strategic_horizons" ON public.strategic_horizons FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_sh_org ON public.strategic_horizons(organization_id);

-- 3. Strategic Alignment Subjects
CREATE TABLE public.strategic_alignment_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL DEFAULT '',
  subject_type TEXT NOT NULL DEFAULT 'initiative',
  subject_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  domain TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_alignment_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_alignment_subjects" ON public.strategic_alignment_subjects FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_sas_org ON public.strategic_alignment_subjects(organization_id);

-- 4. Horizon Alignment Evaluations
CREATE TABLE public.horizon_alignment_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_id UUID NOT NULL REFERENCES public.strategic_horizon_constitutions(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.strategic_alignment_subjects(id) ON DELETE CASCADE,
  horizon_id UUID NOT NULL REFERENCES public.strategic_horizons(id) ON DELETE CASCADE,
  alignment_score NUMERIC NOT NULL DEFAULT 0,
  tension_score NUMERIC NOT NULL DEFAULT 0,
  deferred_risk_score NUMERIC NOT NULL DEFAULT 0,
  support_level TEXT NOT NULL DEFAULT 'moderate',
  evaluation_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.horizon_alignment_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_horizon_evaluations" ON public.horizon_alignment_evaluations FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_hae_org ON public.horizon_alignment_evaluations(organization_id);
CREATE INDEX idx_hae_subject ON public.horizon_alignment_evaluations(subject_id);

-- 5. Horizon Conflict Events
CREATE TABLE public.horizon_conflict_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.strategic_alignment_subjects(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL DEFAULT 'temporal_tension',
  severity TEXT NOT NULL DEFAULT 'moderate',
  affected_horizons JSONB NOT NULL DEFAULT '[]'::jsonb,
  event_summary TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.horizon_conflict_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_horizon_conflicts" ON public.horizon_conflict_events FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_hce_org ON public.horizon_conflict_events(organization_id);

-- 6. Multi-Horizon Recommendations
CREATE TABLE public.multi_horizon_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.strategic_alignment_subjects(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL DEFAULT 'rebalance',
  target_horizon TEXT NOT NULL DEFAULT 'long_term',
  recommendation_summary TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  tradeoff_note TEXT NOT NULL DEFAULT '',
  priority_level TEXT NOT NULL DEFAULT 'medium',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.multi_horizon_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_multi_horizon_recs" ON public.multi_horizon_recommendations FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_mhr_org ON public.multi_horizon_recommendations(organization_id);
