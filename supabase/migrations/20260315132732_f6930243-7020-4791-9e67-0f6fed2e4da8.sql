
-- ═══════════════════════════════════════════════════
-- AI Nervous System NS-01 — RLS Hardening
-- Remove permissive policies, enforce service-role-only writes
-- ═══════════════════════════════════════════════════

-- 1. Drop overly permissive INSERT policy on events (any authenticated member could write)
DROP POLICY IF EXISTS "Service can insert events" ON public.nervous_system_events;

-- 2. Drop overly permissive FOR ALL on patterns (any authenticated member could update/delete)
DROP POLICY IF EXISTS "Members can manage org patterns" ON public.nervous_system_event_patterns;

-- 3. Drop overly permissive FOR ALL on live_state (any authenticated member could update/delete)
DROP POLICY IF EXISTS "Members can manage org live state" ON public.nervous_system_live_state;

-- 4. Add composite index for dedup queries (fingerprint + org + created_at)
CREATE INDEX IF NOT EXISTS idx_ns_events_dedup
  ON public.nervous_system_events(organization_id, fingerprint, created_at DESC);

-- 5. Add occurred_at index for time-range queries
CREATE INDEX IF NOT EXISTS idx_ns_events_occurred
  ON public.nervous_system_events(organization_id, occurred_at DESC);
