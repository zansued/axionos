
-- Memory Lifecycle State — Sprint 2 (Memory Evolution)
-- Tracks lifecycle sweep results and tier transitions for observability and audit.

CREATE TABLE IF NOT EXISTS public.memory_lifecycle_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  memory_id TEXT NOT NULL,
  source_table TEXT NOT NULL DEFAULT '',
  previous_tier TEXT NOT NULL DEFAULT 'operational',
  new_tier TEXT NOT NULL DEFAULT 'operational',
  effective_score NUMERIC NOT NULL DEFAULT 0,
  decay_factor NUMERIC NOT NULL DEFAULT 1,
  access_boost NUMERIC NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL DEFAULT 'tier_transition',
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for org-level queries
CREATE INDEX idx_memory_lifecycle_events_org ON public.memory_lifecycle_events(organization_id, created_at DESC);

-- RLS
ALTER TABLE public.memory_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_isolation" ON public.memory_lifecycle_events
  FOR ALL
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Memory consolidation log
CREATE TABLE IF NOT EXISTS public.memory_consolidation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  consolidation_type TEXT NOT NULL DEFAULT 'dedup',
  entry_ids TEXT[] NOT NULL DEFAULT '{}',
  survivor_id TEXT,
  similarity_score NUMERIC NOT NULL DEFAULT 0,
  quality_gain NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memory_consolidation_log_org ON public.memory_consolidation_log(organization_id, created_at DESC);

ALTER TABLE public.memory_consolidation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_isolation" ON public.memory_consolidation_log
  FOR ALL
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
