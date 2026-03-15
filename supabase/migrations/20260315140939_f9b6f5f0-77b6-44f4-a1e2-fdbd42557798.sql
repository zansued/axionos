
-- NS-03: Contextual Intelligence Layer
-- Adds context fields to events and creates context_links table

-- 1. Add context fields to nervous_system_events
ALTER TABLE public.nervous_system_events
  ADD COLUMN IF NOT EXISTS context_summary jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS context_confidence numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS related_event_ids uuid[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS related_signal_group_ids uuid[] DEFAULT NULL;

-- 2. Indexes for context processing
CREATE INDEX IF NOT EXISTS idx_ns_events_context_pending
  ON public.nervous_system_events (organization_id, created_at)
  WHERE status = 'classified';

CREATE INDEX IF NOT EXISTS idx_ns_events_contextualized
  ON public.nervous_system_events (organization_id, created_at)
  WHERE status = 'contextualized';

-- Index for temporal lookups during contextualization
CREATE INDEX IF NOT EXISTS idx_ns_events_fingerprint_temporal
  ON public.nervous_system_events (organization_id, fingerprint, created_at DESC)
  WHERE status IN ('classified', 'contextualized');

CREATE INDEX IF NOT EXISTS idx_ns_events_agent_temporal
  ON public.nervous_system_events (organization_id, agent_id, created_at DESC)
  WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ns_events_service_temporal
  ON public.nervous_system_events (organization_id, service_name, created_at DESC)
  WHERE service_name IS NOT NULL;

-- 3. Context links table for traceability
CREATE TABLE public.nervous_system_event_context_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  source_event_id uuid NOT NULL,
  related_event_id uuid NOT NULL,
  relation_type text NOT NULL DEFAULT 'temporal_proximity',
  relation_strength numeric NOT NULL DEFAULT 0.5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_relation_type CHECK (relation_type IN (
    'temporal_proximity', 'same_signal_group', 'same_agent',
    'same_service', 'same_initiative', 'causal_candidate'
  )),
  CONSTRAINT valid_relation_strength CHECK (relation_strength >= 0 AND relation_strength <= 1),
  CONSTRAINT no_self_link CHECK (source_event_id <> related_event_id)
);

-- Index for lookups
CREATE INDEX idx_ns_context_links_source
  ON public.nervous_system_event_context_links (organization_id, source_event_id);

CREATE INDEX idx_ns_context_links_related
  ON public.nervous_system_event_context_links (organization_id, related_event_id);

-- 4. RLS for context_links
ALTER TABLE public.nervous_system_event_context_links ENABLE ROW LEVEL SECURITY;

-- SELECT for authenticated org members
CREATE POLICY "ns_context_links_select_org_member"
  ON public.nervous_system_event_context_links
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE for service-role only (no authenticated policy)
-- Service role bypasses RLS, so no explicit policy needed for writes.
