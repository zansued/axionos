
-- ═══════════════════════════════════════════════════
-- AI Nervous System — Sprint NS-02: Signal Classification & Grouping
-- ═══════════════════════════════════════════════════

-- 1. Add classification lifecycle columns to events
ALTER TABLE public.nervous_system_events
  ADD COLUMN IF NOT EXISTS classified_at timestamptz,
  ADD COLUMN IF NOT EXISTS contextualized_at timestamptz,
  ADD COLUMN IF NOT EXISTS surfaced_at timestamptz,
  ADD COLUMN IF NOT EXISTS signal_group_id uuid,
  ADD COLUMN IF NOT EXISTS classification_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Index for processing "new" events efficiently
CREATE INDEX IF NOT EXISTS idx_ns_events_pending
  ON public.nervous_system_events(organization_id, status, created_at)
  WHERE status = 'new';

-- Index for classified events
CREATE INDEX IF NOT EXISTS idx_ns_events_classified
  ON public.nervous_system_events(organization_id, status, classified_at DESC)
  WHERE status = 'classified';

-- 2. Signal groups table — clusters of correlated/repeated events
CREATE TABLE public.nervous_system_signal_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Identity
  fingerprint text NOT NULL,
  group_key text NOT NULL,
  title text NOT NULL,

  -- Classification
  event_domain text NOT NULL,
  event_subdomain text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  severity_score numeric(5,4),

  -- Aggregation
  event_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  representative_event_id uuid,

  -- Scores
  novelty_score numeric(5,4),
  confidence_score numeric(5,4),
  recurrence_score numeric(5,4) NOT NULL DEFAULT 0.0,

  -- Status
  status text NOT NULL DEFAULT 'active',

  -- Context
  source_type text,
  service_name text,
  summary text NOT NULL,
  aggregated_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Constraints
  UNIQUE(organization_id, group_key)
);

CREATE INDEX idx_ns_signal_groups_org ON public.nervous_system_signal_groups(organization_id);
CREATE INDEX idx_ns_signal_groups_status ON public.nervous_system_signal_groups(organization_id, status);
CREATE INDEX idx_ns_signal_groups_severity ON public.nervous_system_signal_groups(organization_id, severity);
CREATE INDEX idx_ns_signal_groups_domain ON public.nervous_system_signal_groups(organization_id, event_domain);
CREATE INDEX idx_ns_signal_groups_last_seen ON public.nervous_system_signal_groups(organization_id, last_seen_at DESC);

-- FK from events to signal groups
ALTER TABLE public.nervous_system_events
  ADD CONSTRAINT fk_ns_events_signal_group
  FOREIGN KEY (signal_group_id)
  REFERENCES public.nervous_system_signal_groups(id)
  ON DELETE SET NULL;

-- 3. RLS for signal groups
ALTER TABLE public.nervous_system_signal_groups ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated org members
CREATE POLICY "Members can read org signal groups"
  ON public.nervous_system_signal_groups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = nervous_system_signal_groups.organization_id
        AND user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE for authenticated — service-role only

-- 4. Enable realtime on signal groups
ALTER PUBLICATION supabase_realtime ADD TABLE public.nervous_system_signal_groups;
