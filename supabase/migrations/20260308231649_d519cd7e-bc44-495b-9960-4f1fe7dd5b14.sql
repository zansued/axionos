
-- Sprint 90: Resilient Large-Scale Orchestration

-- 1. orchestration_campaigns
CREATE TABLE public.orchestration_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  initiative_id uuid REFERENCES public.initiatives(id),
  campaign_label text NOT NULL DEFAULT 'unnamed',
  campaign_class text NOT NULL DEFAULT 'standard',
  topology jsonb NOT NULL DEFAULT '{}'::jsonb,
  sync_point_count int NOT NULL DEFAULT 0,
  failure_domain_count int NOT NULL DEFAULT 0,
  recovery_posture text NOT NULL DEFAULT 'bounded_retry',
  abort_posture text NOT NULL DEFAULT 'graceful',
  status text NOT NULL DEFAULT 'draft',
  branch_total int NOT NULL DEFAULT 0,
  branch_completed int NOT NULL DEFAULT 0,
  branch_failed int NOT NULL DEFAULT 0,
  branch_blocked int NOT NULL DEFAULT 0,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orchestration_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read orchestration_campaigns" ON public.orchestration_campaigns FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert orchestration_campaigns" ON public.orchestration_campaigns FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update orchestration_campaigns" ON public.orchestration_campaigns FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_orchestration_campaign() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','active','paused','completing','completed','degraded','aborting','aborted','failed','recovered') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  IF NEW.recovery_posture NOT IN ('bounded_retry','checkpoint_resume','manual_only','none') THEN RAISE EXCEPTION 'Invalid recovery_posture: %', NEW.recovery_posture; END IF;
  IF NEW.abort_posture NOT IN ('graceful','immediate','checkpoint_rollback') THEN RAISE EXCEPTION 'Invalid abort_posture: %', NEW.abort_posture; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_orchestration_campaign BEFORE INSERT OR UPDATE ON public.orchestration_campaigns FOR EACH ROW EXECUTE FUNCTION public.validate_orchestration_campaign();

-- 2. orchestration_branches
CREATE TABLE public.orchestration_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  campaign_id uuid NOT NULL REFERENCES public.orchestration_campaigns(id),
  branch_key text NOT NULL DEFAULT 'main',
  branch_type text NOT NULL DEFAULT 'sequential',
  parent_branch_id uuid REFERENCES public.orchestration_branches(id),
  status text NOT NULL DEFAULT 'pending',
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 3,
  failure_reason text,
  checkpoint_ref jsonb DEFAULT NULL,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orchestration_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read orchestration_branches" ON public.orchestration_branches FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert orchestration_branches" ON public.orchestration_branches FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update orchestration_branches" ON public.orchestration_branches FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_orchestration_branch() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending','running','completed','failed','blocked','paused','retrying','aborted','skipped') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_orchestration_branch BEFORE INSERT OR UPDATE ON public.orchestration_branches FOR EACH ROW EXECUTE FUNCTION public.validate_orchestration_branch();

-- 3. orchestration_sync_points
CREATE TABLE public.orchestration_sync_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  campaign_id uuid NOT NULL REFERENCES public.orchestration_campaigns(id),
  sync_label text NOT NULL DEFAULT 'barrier',
  sync_type text NOT NULL DEFAULT 'barrier',
  required_branches uuid[] NOT NULL DEFAULT '{}',
  satisfied_branches uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'waiting',
  timeout_seconds int DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz DEFAULT NULL
);

ALTER TABLE public.orchestration_sync_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read orchestration_sync_points" ON public.orchestration_sync_points FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert orchestration_sync_points" ON public.orchestration_sync_points FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update orchestration_sync_points" ON public.orchestration_sync_points FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_orchestration_sync_point() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('waiting','satisfied','timed_out','failed','skipped') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  IF NEW.sync_type NOT IN ('barrier','quorum','any_of','all_of') THEN RAISE EXCEPTION 'Invalid sync_type: %', NEW.sync_type; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_orchestration_sync_point BEFORE INSERT OR UPDATE ON public.orchestration_sync_points FOR EACH ROW EXECUTE FUNCTION public.validate_orchestration_sync_point();

-- 4. orchestration_failures
CREATE TABLE public.orchestration_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  campaign_id uuid NOT NULL REFERENCES public.orchestration_campaigns(id),
  branch_id uuid REFERENCES public.orchestration_branches(id),
  failure_domain text NOT NULL DEFAULT 'unknown',
  severity text NOT NULL DEFAULT 'low',
  failure_reason text NOT NULL DEFAULT '',
  impact_scope text NOT NULL DEFAULT 'branch_only',
  containment_status text NOT NULL DEFAULT 'uncontained',
  evidence_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orchestration_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read orchestration_failures" ON public.orchestration_failures FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert orchestration_failures" ON public.orchestration_failures FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_orchestration_failure() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.severity NOT IN ('low','moderate','high','critical') THEN RAISE EXCEPTION 'Invalid severity: %', NEW.severity; END IF;
  IF NEW.impact_scope NOT IN ('branch_only','sync_group','campaign_wide') THEN RAISE EXCEPTION 'Invalid impact_scope: %', NEW.impact_scope; END IF;
  IF NEW.containment_status NOT IN ('uncontained','contained','escalated','resolved') THEN RAISE EXCEPTION 'Invalid containment_status: %', NEW.containment_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_orchestration_failure BEFORE INSERT OR UPDATE ON public.orchestration_failures FOR EACH ROW EXECUTE FUNCTION public.validate_orchestration_failure();

-- 5. orchestration_recovery_events
CREATE TABLE public.orchestration_recovery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  campaign_id uuid NOT NULL REFERENCES public.orchestration_campaigns(id),
  branch_id uuid REFERENCES public.orchestration_branches(id),
  failure_id uuid REFERENCES public.orchestration_failures(id),
  recovery_type text NOT NULL DEFAULT 'retry',
  recovery_status text NOT NULL DEFAULT 'pending',
  recovery_notes text NOT NULL DEFAULT '',
  reviewer_ref jsonb DEFAULT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz DEFAULT NULL
);

ALTER TABLE public.orchestration_recovery_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read orchestration_recovery_events" ON public.orchestration_recovery_events FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert orchestration_recovery_events" ON public.orchestration_recovery_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update orchestration_recovery_events" ON public.orchestration_recovery_events FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_orchestration_recovery() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.recovery_type NOT IN ('retry','checkpoint_resume','manual_intervention','rollback','skip') THEN RAISE EXCEPTION 'Invalid recovery_type: %', NEW.recovery_type; END IF;
  IF NEW.recovery_status NOT IN ('pending','in_progress','succeeded','failed','skipped') THEN RAISE EXCEPTION 'Invalid recovery_status: %', NEW.recovery_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_orchestration_recovery BEFORE INSERT OR UPDATE ON public.orchestration_recovery_events FOR EACH ROW EXECUTE FUNCTION public.validate_orchestration_recovery();
