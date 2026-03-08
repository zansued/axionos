
-- Sprint 88: Cross-Region Execution & Recovery

-- 1. region_execution_postures — region-aware execution records
CREATE TABLE public.region_execution_postures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  job_id UUID REFERENCES public.distributed_jobs(id),
  primary_region TEXT NOT NULL DEFAULT 'default',
  fallback_regions JSONB NOT NULL DEFAULT '[]'::jsonb,
  recovery_status TEXT NOT NULL DEFAULT 'healthy',
  failover_posture TEXT NOT NULL DEFAULT 'none',
  continuity_confidence NUMERIC NOT NULL DEFAULT 1.0,
  trade_off_notes TEXT NOT NULL DEFAULT '',
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.region_execution_postures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_region_exec" ON public.region_execution_postures FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_ins_region_exec" ON public.region_execution_postures FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_upd_region_exec" ON public.region_execution_postures FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_region_execution_posture()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.recovery_status NOT IN ('healthy','degraded','recovering','recovered','failed') THEN RAISE EXCEPTION 'Invalid recovery_status: %', NEW.recovery_status; END IF;
  IF NEW.failover_posture NOT IN ('none','recommended','approved','active','completed','rolled_back') THEN RAISE EXCEPTION 'Invalid failover_posture: %', NEW.failover_posture; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_region_execution_posture BEFORE INSERT OR UPDATE ON public.region_execution_postures FOR EACH ROW EXECUTE FUNCTION public.validate_region_execution_posture();

-- 2. region_health_signals — regional health observations
CREATE TABLE public.region_health_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  region_name TEXT NOT NULL DEFAULT '',
  signal_type TEXT NOT NULL DEFAULT 'latency',
  severity TEXT NOT NULL DEFAULT 'low',
  description TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.region_health_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_region_health" ON public.region_health_signals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_ins_region_health" ON public.region_health_signals FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 3. region_failover_decisions — governed failover decision records
CREATE TABLE public.region_failover_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  posture_id UUID NOT NULL REFERENCES public.region_execution_postures(id) ON DELETE CASCADE,
  from_region TEXT NOT NULL DEFAULT '',
  to_region TEXT NOT NULL DEFAULT '',
  decision_status TEXT NOT NULL DEFAULT 'recommended',
  decision_reason TEXT NOT NULL DEFAULT '',
  trade_off_summary TEXT NOT NULL DEFAULT '',
  reviewer_ref JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.region_failover_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_region_failover" ON public.region_failover_decisions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_ins_region_failover" ON public.region_failover_decisions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_upd_region_failover" ON public.region_failover_decisions FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_region_failover_decision()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.decision_status NOT IN ('recommended','approved','active','completed','rejected','rolled_back') THEN RAISE EXCEPTION 'Invalid decision_status: %', NEW.decision_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_region_failover_decision BEFORE INSERT OR UPDATE ON public.region_failover_decisions FOR EACH ROW EXECUTE FUNCTION public.validate_region_failover_decision();

-- 4. region_recovery_events — audit trail
CREATE TABLE public.region_recovery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  posture_id UUID REFERENCES public.region_execution_postures(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'status_change',
  from_status TEXT,
  to_status TEXT,
  reason TEXT NOT NULL DEFAULT '',
  actor_ref JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.region_recovery_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_sel_region_recovery" ON public.region_recovery_events FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_ins_region_recovery" ON public.region_recovery_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
