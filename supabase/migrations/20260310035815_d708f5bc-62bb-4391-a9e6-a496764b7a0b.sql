
-- Sprint 120: Tenant Doctrine & Adaptive Operating Profiles v2

CREATE TABLE public.tenant_operating_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  doctrine_mode TEXT NOT NULL DEFAULT 'balanced',
  risk_tolerance_score NUMERIC NOT NULL DEFAULT 0.5,
  validation_strictness_score NUMERIC NOT NULL DEFAULT 0.5,
  rollback_preference_score NUMERIC NOT NULL DEFAULT 0.5,
  rollout_cadence_score NUMERIC NOT NULL DEFAULT 0.5,
  incident_escalation_bias NUMERIC NOT NULL DEFAULT 0.5,
  autonomy_tolerance_score NUMERIC NOT NULL DEFAULT 0.5,
  evidence_confidence NUMERIC NOT NULL DEFAULT 0,
  profile_status TEXT NOT NULL DEFAULT 'draft',
  declared_profile JSONB NOT NULL DEFAULT '{}',
  observed_profile JSONB NOT NULL DEFAULT '{}',
  divergence_score NUMERIC NOT NULL DEFAULT 0,
  reviewed_by TEXT DEFAULT NULL,
  approved_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_doctrine_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.tenant_operating_profiles(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL DEFAULT 'runtime_observation',
  signal_source TEXT NOT NULL DEFAULT 'system',
  signal_payload JSONB NOT NULL DEFAULT '{}',
  affected_dimension TEXT NOT NULL DEFAULT 'general',
  strength NUMERIC NOT NULL DEFAULT 0.5,
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.doctrine_adjustment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.tenant_operating_profiles(id) ON DELETE SET NULL,
  adjustment_type TEXT NOT NULL DEFAULT 'score_update',
  dimension TEXT NOT NULL DEFAULT 'general',
  previous_value NUMERIC NOT NULL DEFAULT 0,
  new_value NUMERIC NOT NULL DEFAULT 0,
  delta NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  applied_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.doctrine_conflict_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.tenant_operating_profiles(id) ON DELETE SET NULL,
  conflict_type TEXT NOT NULL DEFAULT 'declared_vs_observed',
  dimension_a TEXT NOT NULL DEFAULT '',
  dimension_b TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'low',
  description TEXT NOT NULL DEFAULT '',
  resolution_status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT DEFAULT NULL,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE public.runtime_preference_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pattern_key TEXT NOT NULL DEFAULT '',
  pattern_type TEXT NOT NULL DEFAULT 'behavioral',
  observation_count INT NOT NULL DEFAULT 1,
  confidence NUMERIC NOT NULL DEFAULT 0,
  preference_vector JSONB NOT NULL DEFAULT '{}',
  source_events JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'detected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.escalation_posture_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  escalation_speed TEXT NOT NULL DEFAULT 'moderate',
  auto_escalation_threshold NUMERIC NOT NULL DEFAULT 0.7,
  human_review_preference NUMERIC NOT NULL DEFAULT 0.5,
  incident_response_bias TEXT NOT NULL DEFAULT 'balanced',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rollout_risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rollout_strategy TEXT NOT NULL DEFAULT 'staged',
  risk_appetite TEXT NOT NULL DEFAULT 'moderate',
  canary_preference NUMERIC NOT NULL DEFAULT 0.5,
  rollback_trigger_threshold NUMERIC NOT NULL DEFAULT 0.3,
  deploy_frequency_score NUMERIC NOT NULL DEFAULT 0.5,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_doctrine_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.tenant_operating_profiles(id) ON DELETE SET NULL,
  review_type TEXT NOT NULL DEFAULT 'periodic',
  reviewer_id TEXT DEFAULT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  findings JSONB NOT NULL DEFAULT '{}',
  recommendations JSONB NOT NULL DEFAULT '[]',
  review_notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ DEFAULT NULL
);

-- RLS
ALTER TABLE public.tenant_operating_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_doctrine_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctrine_adjustment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctrine_conflict_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_preference_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_posture_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rollout_risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_doctrine_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.tenant_operating_profiles FOR ALL USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "org_isolation" ON public.tenant_doctrine_signals FOR ALL USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "org_isolation" ON public.doctrine_adjustment_events FOR ALL USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "org_isolation" ON public.doctrine_conflict_cases FOR ALL USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "org_isolation" ON public.runtime_preference_patterns FOR ALL USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "org_isolation" ON public.escalation_posture_profiles FOR ALL USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "org_isolation" ON public.rollout_risk_profiles FOR ALL USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "org_isolation" ON public.tenant_doctrine_reviews FOR ALL USING (organization_id IN (SELECT id FROM public.organizations));

-- Indexes
CREATE INDEX idx_tenant_operating_profiles_org ON public.tenant_operating_profiles(organization_id);
CREATE INDEX idx_tenant_doctrine_signals_org ON public.tenant_doctrine_signals(organization_id);
CREATE INDEX idx_doctrine_adjustment_events_org ON public.doctrine_adjustment_events(organization_id);
CREATE INDEX idx_doctrine_conflict_cases_org ON public.doctrine_conflict_cases(organization_id);
CREATE INDEX idx_runtime_preference_patterns_org ON public.runtime_preference_patterns(organization_id);
CREATE INDEX idx_escalation_posture_profiles_org ON public.escalation_posture_profiles(organization_id);
CREATE INDEX idx_rollout_risk_profiles_org ON public.rollout_risk_profiles(organization_id);
CREATE INDEX idx_tenant_doctrine_reviews_org ON public.tenant_doctrine_reviews(organization_id);
