
-- Sprint 22: Bounded Promotion & Rollback Guard

-- Table 1: prompt_rollout_windows
CREATE TABLE public.prompt_rollout_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stage_key text NOT NULL,
  promoted_variant_id uuid NOT NULL REFERENCES public.prompt_variants(id) ON DELETE CASCADE,
  previous_control_variant_id uuid REFERENCES public.prompt_variants(id) ON DELETE SET NULL,
  rollout_mode text NOT NULL DEFAULT 'manual_confirmed' CHECK (rollout_mode IN ('manual_confirmed', 'bounded_auto')),
  rollout_strategy text NOT NULL DEFAULT 'immediate' CHECK (rollout_strategy IN ('immediate', 'phased_10_25_50_100')),
  rollout_status text NOT NULL DEFAULT 'active' CHECK (rollout_status IN ('active', 'paused', 'completed', 'rolled_back')),
  current_exposure_percent integer NOT NULL DEFAULT 10,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.prompt_rollout_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rollout windows in their org"
  ON public.prompt_rollout_windows FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert rollout windows in their org"
  ON public.prompt_rollout_windows FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update rollout windows in their org"
  ON public.prompt_rollout_windows FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_rollout_windows_org_status ON public.prompt_rollout_windows(organization_id, rollout_status);
CREATE INDEX idx_rollout_windows_variant ON public.prompt_rollout_windows(promoted_variant_id);

-- Table 2: prompt_promotion_health_checks
CREATE TABLE public.prompt_promotion_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rollout_window_id uuid NOT NULL REFERENCES public.prompt_rollout_windows(id) ON DELETE CASCADE,
  prompt_variant_id uuid NOT NULL REFERENCES public.prompt_variants(id) ON DELETE CASCADE,
  check_window_start timestamptz NOT NULL,
  check_window_end timestamptz NOT NULL,
  executions integer NOT NULL DEFAULT 0,
  success_rate numeric,
  repair_rate numeric,
  avg_cost_usd numeric,
  avg_duration_ms numeric,
  avg_quality_score numeric,
  regression_flags jsonb,
  health_status text NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'watch', 'rollback_recommended', 'rollback_required')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_promotion_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view health checks in their org"
  ON public.prompt_promotion_health_checks FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert health checks in their org"
  ON public.prompt_promotion_health_checks FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_health_checks_rollout ON public.prompt_promotion_health_checks(rollout_window_id);
CREATE INDEX idx_health_checks_org ON public.prompt_promotion_health_checks(organization_id);

-- Table 3: prompt_rollback_events
CREATE TABLE public.prompt_rollback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rollout_window_id uuid NOT NULL REFERENCES public.prompt_rollout_windows(id) ON DELETE CASCADE,
  rolled_back_variant_id uuid NOT NULL REFERENCES public.prompt_variants(id) ON DELETE CASCADE,
  restored_control_variant_id uuid NOT NULL REFERENCES public.prompt_variants(id) ON DELETE CASCADE,
  rollback_reason jsonb NOT NULL DEFAULT '{}',
  rollback_mode text NOT NULL DEFAULT 'manual' CHECK (rollback_mode IN ('manual', 'bounded_auto')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_rollback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rollback events in their org"
  ON public.prompt_rollback_events FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert rollback events in their org"
  ON public.prompt_rollback_events FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_rollback_events_org ON public.prompt_rollback_events(organization_id);
CREATE INDEX idx_rollback_events_rollout ON public.prompt_rollback_events(rollout_window_id);
