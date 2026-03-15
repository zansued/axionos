
-- ═══════════════════════════════════════════════════
-- AI Nervous System — Sprint NS-01: Signal Foundation
-- ═══════════════════════════════════════════════════

-- 1. Core events table
CREATE TABLE public.nervous_system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  occurred_at timestamptz NOT NULL DEFAULT now(),

  source_type text NOT NULL,
  source_id text,
  event_type text NOT NULL,
  event_domain text NOT NULL,
  event_subdomain text,

  initiative_id uuid,
  pipeline_id uuid,
  agent_id uuid,
  service_name text,

  severity text NOT NULL DEFAULT 'low',
  severity_score numeric(5,4),
  novelty_score numeric(5,4),
  confidence_score numeric(5,4),

  fingerprint text,
  dedup_group text,

  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  status text NOT NULL DEFAULT 'new'
);

CREATE INDEX idx_ns_events_org ON public.nervous_system_events(organization_id);
CREATE INDEX idx_ns_events_type ON public.nervous_system_events(event_type);
CREATE INDEX idx_ns_events_domain ON public.nervous_system_events(event_domain);
CREATE INDEX idx_ns_events_status ON public.nervous_system_events(status);
CREATE INDEX idx_ns_events_created ON public.nervous_system_events(created_at DESC);
CREATE INDEX idx_ns_events_fingerprint ON public.nervous_system_events(fingerprint);
CREATE INDEX idx_ns_events_severity ON public.nervous_system_events(severity);

-- 2. Learned patterns
CREATE TABLE public.nervous_system_event_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  pattern_key text NOT NULL,
  title text NOT NULL,
  domain text NOT NULL,
  subdomain text,

  description text,
  known_causes jsonb NOT NULL DEFAULT '[]'::jsonb,
  known_resolutions jsonb NOT NULL DEFAULT '[]'::jsonb,

  occurrence_count integer NOT NULL DEFAULT 0,
  successful_resolution_count integer NOT NULL DEFAULT 0,
  confidence_score numeric(5,4),

  canon_reference_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  UNIQUE(organization_id, pattern_key)
);

CREATE INDEX idx_ns_patterns_org ON public.nervous_system_event_patterns(organization_id);
CREATE INDEX idx_ns_patterns_domain ON public.nervous_system_event_patterns(domain);

-- 3. Live state cache (materialized for UI)
CREATE TABLE public.nervous_system_live_state (
  state_key text NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  state_value jsonb NOT NULL DEFAULT '{}'::jsonb,

  PRIMARY KEY (organization_id, state_key)
);

-- ═══════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════

ALTER TABLE public.nervous_system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nervous_system_event_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nervous_system_live_state ENABLE ROW LEVEL SECURITY;

-- Events: members can read, service role inserts
CREATE POLICY "Members can read org events"
  ON public.nervous_system_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = nervous_system_events.organization_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert events"
  ON public.nervous_system_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = nervous_system_events.organization_id
        AND user_id = auth.uid()
    )
  );

-- Patterns: members can read
CREATE POLICY "Members can read org patterns"
  ON public.nervous_system_event_patterns FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = nervous_system_event_patterns.organization_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage org patterns"
  ON public.nervous_system_event_patterns FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = nervous_system_event_patterns.organization_id
        AND user_id = auth.uid()
    )
  );

-- Live state: members can read
CREATE POLICY "Members can read org live state"
  ON public.nervous_system_live_state FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = nervous_system_live_state.organization_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage org live state"
  ON public.nervous_system_live_state FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = nervous_system_live_state.organization_id
        AND user_id = auth.uid()
    )
  );

-- Enable Realtime for live feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.nervous_system_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nervous_system_live_state;
