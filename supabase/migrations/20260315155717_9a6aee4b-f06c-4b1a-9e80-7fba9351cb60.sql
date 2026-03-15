-- NS Integration: Add handoff traceability fields to surfaced items
-- These fields bridge NS surfaced items to the existing action_registry_entries

ALTER TABLE public.nervous_system_surfaced_items
  ADD COLUMN IF NOT EXISTS handoff_action_id text NULL,
  ADD COLUMN IF NOT EXISTS handoff_status text NULL,
  ADD COLUMN IF NOT EXISTS handoff_at timestamptz NULL;

-- Index for handoff queries
CREATE INDEX IF NOT EXISTS idx_ns_surfaced_handoff_status
  ON public.nervous_system_surfaced_items(organization_id, handoff_status)
  WHERE handoff_action_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.nervous_system_surfaced_items.handoff_action_id IS 'action_id from action_registry_entries when handed off to existing action engine';
COMMENT ON COLUMN public.nervous_system_surfaced_items.handoff_status IS 'Handoff lifecycle: handed_off, action_completed, action_failed';
COMMENT ON COLUMN public.nervous_system_surfaced_items.handoff_at IS 'Timestamp when item was handed off to action engine';
