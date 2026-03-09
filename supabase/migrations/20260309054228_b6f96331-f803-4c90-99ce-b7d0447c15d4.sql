
-- Sprint 101: Federated Intelligence Boundaries

-- Enums
CREATE TYPE public.boundary_type AS ENUM ('hard', 'controlled', 'advisory', 'aggregate_only');
CREATE TYPE public.transfer_mode AS ENUM ('deny', 'allow', 'allow_aggregated', 'allow_anonymized', 'allow_with_review');
CREATE TYPE public.transfer_decision AS ENUM ('allowed', 'denied', 'transformed', 'escalated');

-- federated_boundaries
CREATE TABLE public.federated_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boundary_code TEXT NOT NULL DEFAULT '',
  source_scope TEXT NOT NULL DEFAULT '',
  target_scope TEXT NOT NULL DEFAULT '',
  boundary_type public.boundary_type NOT NULL DEFAULT 'hard',
  boundary_status TEXT NOT NULL DEFAULT 'active',
  description TEXT NOT NULL DEFAULT '',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_federated_boundaries_org ON public.federated_boundaries(organization_id);
ALTER TABLE public.federated_boundaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage federated_boundaries in their org" ON public.federated_boundaries FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));

-- boundary_transfer_policies
CREATE TABLE public.boundary_transfer_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boundary_id UUID NOT NULL REFERENCES public.federated_boundaries(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL DEFAULT '',
  transfer_mode public.transfer_mode NOT NULL DEFAULT 'deny',
  sensitivity_level TEXT NOT NULL DEFAULT 'standard',
  justification_requirements TEXT NOT NULL DEFAULT '',
  review_policy TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_boundary_transfer_policies_org ON public.boundary_transfer_policies(organization_id);
CREATE INDEX idx_boundary_transfer_policies_boundary ON public.boundary_transfer_policies(boundary_id);
ALTER TABLE public.boundary_transfer_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage boundary_transfer_policies in their org" ON public.boundary_transfer_policies FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));

-- federated_transfer_events
CREATE TABLE public.federated_transfer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boundary_id UUID NOT NULL REFERENCES public.federated_boundaries(id) ON DELETE CASCADE,
  source_entity TEXT NOT NULL DEFAULT '',
  target_entity TEXT NOT NULL DEFAULT '',
  signal_type TEXT NOT NULL DEFAULT '',
  transfer_decision public.transfer_decision NOT NULL DEFAULT 'denied',
  transformation_type TEXT,
  reason_summary TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '{}',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_federated_transfer_events_org ON public.federated_transfer_events(organization_id);
CREATE INDEX idx_federated_transfer_events_boundary ON public.federated_transfer_events(boundary_id);
ALTER TABLE public.federated_transfer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage federated_transfer_events in their org" ON public.federated_transfer_events FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));

-- boundary_violation_events
CREATE TABLE public.boundary_violation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boundary_id UUID NOT NULL REFERENCES public.federated_boundaries(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'low',
  event_summary TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_boundary_violation_events_org ON public.boundary_violation_events(organization_id);
ALTER TABLE public.boundary_violation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage boundary_violation_events in their org" ON public.boundary_violation_events FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));

-- federated_shared_patterns
CREATE TABLE public.federated_shared_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_code TEXT NOT NULL DEFAULT '',
  origin_scope TEXT NOT NULL DEFAULT '',
  shareability_type TEXT NOT NULL DEFAULT 'aggregate_only',
  aggregation_method TEXT NOT NULL DEFAULT '',
  pattern_summary TEXT NOT NULL DEFAULT '',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_federated_shared_patterns_org ON public.federated_shared_patterns(organization_id);
ALTER TABLE public.federated_shared_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage federated_shared_patterns in their org" ON public.federated_shared_patterns FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
