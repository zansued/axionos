
-- Sprint 99: Cross-Context Doctrine Adaptation
-- Enums
CREATE TYPE public.doctrine_scope AS ENUM ('core', 'federated', 'local', 'operational');
CREATE TYPE public.doctrine_immutability AS ENUM ('strict', 'bounded', 'flexible');
CREATE TYPE public.adaptation_type AS ENUM ('interpretive', 'restrictive', 'permissive', 'sequencing', 'threshold');
CREATE TYPE public.evaluation_result AS ENUM ('compatible', 'adapted', 'conflicting', 'blocked');
CREATE TYPE public.drift_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Doctrine Context Profiles
CREATE TABLE public.doctrine_context_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_code TEXT NOT NULL DEFAULT '',
  context_name TEXT NOT NULL DEFAULT '',
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  environment_type TEXT NOT NULL DEFAULT 'production',
  operational_domain TEXT NOT NULL DEFAULT 'general',
  regulatory_sensitivity TEXT NOT NULL DEFAULT 'standard',
  doctrine_profile_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Doctrine Adaptation Rules
CREATE TABLE public.doctrine_adaptation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctrine_id UUID NOT NULL REFERENCES public.institutional_doctrines(id),
  context_profile_id UUID NOT NULL REFERENCES public.doctrine_context_profiles(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  adaptation_type public.adaptation_type NOT NULL DEFAULT 'interpretive',
  adaptation_rule_text TEXT NOT NULL DEFAULT '',
  justification TEXT NOT NULL DEFAULT '',
  boundary_conditions JSONB NOT NULL DEFAULT '{}',
  confidence_model JSONB NOT NULL DEFAULT '{}',
  requires_review BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Doctrine Adaptation Evaluations
CREATE TABLE public.doctrine_adaptation_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_profile_id UUID NOT NULL REFERENCES public.doctrine_context_profiles(id),
  doctrine_id UUID NOT NULL REFERENCES public.institutional_doctrines(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  target_subject_type TEXT NOT NULL DEFAULT '',
  target_subject_id TEXT NOT NULL DEFAULT '',
  evaluation_result public.evaluation_result NOT NULL DEFAULT 'compatible',
  compatibility_score NUMERIC NOT NULL DEFAULT 0,
  drift_risk_score NUMERIC NOT NULL DEFAULT 0,
  adaptation_summary TEXT NOT NULL DEFAULT '',
  blocked_reasons JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Doctrine Drift Events
CREATE TABLE public.doctrine_drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctrine_id UUID NOT NULL REFERENCES public.institutional_doctrines(id),
  context_profile_id UUID NOT NULL REFERENCES public.doctrine_context_profiles(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  drift_type TEXT NOT NULL DEFAULT '',
  severity public.drift_severity NOT NULL DEFAULT 'low',
  drift_summary TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '{}',
  resolution_status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_doctrine_context_profiles_org ON public.doctrine_context_profiles(organization_id);
CREATE INDEX idx_doctrine_adaptation_rules_doctrine ON public.doctrine_adaptation_rules(doctrine_id);
CREATE INDEX idx_doctrine_adaptation_rules_context ON public.doctrine_adaptation_rules(context_profile_id);
CREATE INDEX idx_doctrine_adaptation_evaluations_context ON public.doctrine_adaptation_evaluations(context_profile_id);
CREATE INDEX idx_doctrine_adaptation_evaluations_doctrine ON public.doctrine_adaptation_evaluations(doctrine_id);
CREATE INDEX idx_doctrine_drift_events_doctrine ON public.doctrine_drift_events(doctrine_id);
CREATE INDEX idx_doctrine_drift_events_context ON public.doctrine_drift_events(context_profile_id);
CREATE INDEX idx_doctrine_drift_events_org ON public.doctrine_drift_events(organization_id);

-- RLS
ALTER TABLE public.doctrine_context_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctrine_adaptation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctrine_adaptation_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctrine_drift_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org doctrine context profiles" ON public.doctrine_context_profiles FOR SELECT TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can insert own org doctrine context profiles" ON public.doctrine_context_profiles FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can update own org doctrine context profiles" ON public.doctrine_context_profiles FOR UPDATE TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));

CREATE POLICY "Users can view own org doctrine adaptation rules" ON public.doctrine_adaptation_rules FOR SELECT TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can insert own org doctrine adaptation rules" ON public.doctrine_adaptation_rules FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can update own org doctrine adaptation rules" ON public.doctrine_adaptation_rules FOR UPDATE TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));

CREATE POLICY "Users can view own org doctrine adaptation evaluations" ON public.doctrine_adaptation_evaluations FOR SELECT TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can insert own org doctrine adaptation evaluations" ON public.doctrine_adaptation_evaluations FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));

CREATE POLICY "Users can view own org doctrine drift events" ON public.doctrine_drift_events FOR SELECT TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can insert own org doctrine drift events" ON public.doctrine_drift_events FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can update own org doctrine drift events" ON public.doctrine_drift_events FOR UPDATE TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
