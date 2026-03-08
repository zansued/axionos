
-- Sprint 87: Distributed Job Control Plane

-- 1. distributed_jobs — canonical distributed job records
CREATE TABLE public.distributed_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  initiative_id UUID REFERENCES public.initiatives(id),
  job_class TEXT NOT NULL DEFAULT 'general',
  job_label TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 5,
  routing_target TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'queued',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  abort_reason TEXT,
  fail_reason TEXT,
  lineage_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.distributed_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_distributed_jobs" ON public.distributed_jobs
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_distributed_jobs" ON public.distributed_jobs
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_distributed_jobs" ON public.distributed_jobs
  FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_distributed_job_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('queued','assigned','running','paused','retrying','completed','failed','aborted') THEN
    RAISE EXCEPTION 'Invalid distributed_jobs status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_distributed_job_status
  BEFORE INSERT OR UPDATE ON public.distributed_jobs
  FOR EACH ROW EXECUTE FUNCTION public.validate_distributed_job_status();

-- 2. distributed_job_assignments — worker/target assignment records
CREATE TABLE public.distributed_job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  job_id UUID NOT NULL REFERENCES public.distributed_jobs(id) ON DELETE CASCADE,
  assigned_target TEXT NOT NULL DEFAULT '',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assignment_status TEXT NOT NULL DEFAULT 'assigned',
  notes TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.distributed_job_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_distributed_job_assignments" ON public.distributed_job_assignments
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_distributed_job_assignments" ON public.distributed_job_assignments
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_distributed_job_assignment_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.assignment_status NOT IN ('assigned','running','completed','failed','cancelled') THEN
    RAISE EXCEPTION 'Invalid assignment_status: %', NEW.assignment_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_distributed_job_assignment_status
  BEFORE INSERT OR UPDATE ON public.distributed_job_assignments
  FOR EACH ROW EXECUTE FUNCTION public.validate_distributed_job_assignment_status();

-- 3. distributed_job_dependencies — dependency graph between jobs
CREATE TABLE public.distributed_job_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  job_id UUID NOT NULL REFERENCES public.distributed_jobs(id) ON DELETE CASCADE,
  depends_on_job_id UUID NOT NULL REFERENCES public.distributed_jobs(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'completion',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.distributed_job_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_distributed_job_dependencies" ON public.distributed_job_dependencies
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_distributed_job_dependencies" ON public.distributed_job_dependencies
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. distributed_job_events — audit trail of state changes
CREATE TABLE public.distributed_job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  job_id UUID NOT NULL REFERENCES public.distributed_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'status_change',
  from_status TEXT,
  to_status TEXT,
  reason TEXT NOT NULL DEFAULT '',
  actor_ref JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.distributed_job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_distributed_job_events" ON public.distributed_job_events
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_distributed_job_events" ON public.distributed_job_events
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
