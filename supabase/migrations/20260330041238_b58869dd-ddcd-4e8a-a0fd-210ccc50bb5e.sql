
-- Nervous System Temporal State (LIF Layer) — Sprint 1
-- Adds temporal accumulation, decay, and operational state tracking

CREATE TABLE public.nervous_system_temporal_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Accumulation dimension
  domain text NOT NULL,
  subdomain text NOT NULL DEFAULT 'general',
  signal_group_id uuid REFERENCES public.nervous_system_signal_groups(id) ON DELETE SET NULL,
  
  -- LIF (Leaky Integrate-and-Fire) state
  accumulated_charge numeric(8,4) NOT NULL DEFAULT 0,
  leak_rate numeric(6,4) NOT NULL DEFAULT 0.05,
  fire_threshold numeric(8,4) NOT NULL DEFAULT 1.0,
  last_spike_at timestamptz,
  spike_count integer NOT NULL DEFAULT 0,
  
  -- Window metrics
  event_count_window integer NOT NULL DEFAULT 0,
  window_start_at timestamptz NOT NULL DEFAULT now(),
  window_duration_ms integer NOT NULL DEFAULT 3600000,
  avg_severity_window numeric(6,4) DEFAULT 0,
  max_severity_window numeric(6,4) DEFAULT 0,
  
  -- Derived operational state
  operational_state text NOT NULL DEFAULT 'nominal',
  state_entered_at timestamptz NOT NULL DEFAULT now(),
  previous_state text,
  
  -- Cascade detection
  cascade_depth integer NOT NULL DEFAULT 0,
  cascade_related_domains text[] DEFAULT '{}',
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ns_temporal_org ON public.nervous_system_temporal_state(organization_id);
CREATE INDEX idx_ns_temporal_domain ON public.nervous_system_temporal_state(organization_id, domain);
CREATE INDEX idx_ns_temporal_state ON public.nervous_system_temporal_state(organization_id, operational_state);

CREATE UNIQUE INDEX idx_ns_temporal_unique_group ON public.nervous_system_temporal_state(organization_id, domain, subdomain, signal_group_id)
  WHERE signal_group_id IS NOT NULL;
CREATE UNIQUE INDEX idx_ns_temporal_unique_null ON public.nervous_system_temporal_state(organization_id, domain, subdomain)
  WHERE signal_group_id IS NULL;

-- RLS
ALTER TABLE public.nervous_system_temporal_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read org temporal state"
  ON public.nervous_system_temporal_state FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = nervous_system_temporal_state.organization_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages temporal state"
  ON public.nervous_system_temporal_state FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Validation trigger instead of CHECK constraint for operational_state
CREATE OR REPLACE FUNCTION public.validate_ns_temporal_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.operational_state NOT IN ('nominal', 'elevated', 'stressed', 'pain', 'fatigued', 'recovering', 'critical_cascade') THEN
    RAISE EXCEPTION 'Invalid operational_state: %', NEW.operational_state;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_ns_temporal_state
  BEFORE INSERT OR UPDATE ON public.nervous_system_temporal_state
  FOR EACH ROW EXECUTE FUNCTION public.validate_ns_temporal_state();
