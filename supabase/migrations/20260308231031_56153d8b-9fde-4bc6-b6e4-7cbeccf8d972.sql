
-- Sprint 89: Tenant-Isolated Scale Runtime

-- 1. tenant_runtime_postures
CREATE TABLE public.tenant_runtime_postures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  segment_label text NOT NULL DEFAULT 'default',
  workload_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  fairness_posture text NOT NULL DEFAULT 'balanced',
  isolation_posture text NOT NULL DEFAULT 'strict',
  contention_posture text NOT NULL DEFAULT 'healthy',
  resource_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  blast_radius_scope text NOT NULL DEFAULT 'tenant_only',
  active_workload_count int NOT NULL DEFAULT 0,
  posture_confidence numeric NOT NULL DEFAULT 0.5,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_runtime_postures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read tenant_runtime_postures" ON public.tenant_runtime_postures FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert tenant_runtime_postures" ON public.tenant_runtime_postures FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update tenant_runtime_postures" ON public.tenant_runtime_postures FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_tenant_runtime_posture() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.fairness_posture NOT IN ('balanced','prioritized','throttled','degraded') THEN RAISE EXCEPTION 'Invalid fairness_posture: %', NEW.fairness_posture; END IF;
  IF NEW.isolation_posture NOT IN ('strict','relaxed','shared','degraded') THEN RAISE EXCEPTION 'Invalid isolation_posture: %', NEW.isolation_posture; END IF;
  IF NEW.contention_posture NOT IN ('healthy','elevated','high','critical') THEN RAISE EXCEPTION 'Invalid contention_posture: %', NEW.contention_posture; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_tenant_runtime_posture BEFORE INSERT OR UPDATE ON public.tenant_runtime_postures FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_runtime_posture();

-- 2. tenant_runtime_segments
CREATE TABLE public.tenant_runtime_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  posture_id uuid REFERENCES public.tenant_runtime_postures(id),
  segment_key text NOT NULL DEFAULT 'default',
  segment_type text NOT NULL DEFAULT 'standard',
  partition_label text NOT NULL DEFAULT 'auto',
  workload_class text NOT NULL DEFAULT 'general',
  isolation_level text NOT NULL DEFAULT 'strict',
  max_concurrency int NOT NULL DEFAULT 10,
  current_concurrency int NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'low',
  status text NOT NULL DEFAULT 'active',
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_runtime_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read tenant_runtime_segments" ON public.tenant_runtime_segments FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert tenant_runtime_segments" ON public.tenant_runtime_segments FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update tenant_runtime_segments" ON public.tenant_runtime_segments FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_tenant_runtime_segment() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.risk_level NOT IN ('low','moderate','high','critical') THEN RAISE EXCEPTION 'Invalid risk_level: %', NEW.risk_level; END IF;
  IF NEW.status NOT IN ('active','paused','degraded','retired') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_tenant_runtime_segment BEFORE INSERT OR UPDATE ON public.tenant_runtime_segments FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_runtime_segment();

-- 3. tenant_runtime_contention_events
CREATE TABLE public.tenant_runtime_contention_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  segment_id uuid REFERENCES public.tenant_runtime_segments(id),
  posture_id uuid REFERENCES public.tenant_runtime_postures(id),
  event_type text NOT NULL DEFAULT 'contention_detected',
  severity text NOT NULL DEFAULT 'low',
  contention_source text NOT NULL DEFAULT 'unknown',
  affected_workloads int NOT NULL DEFAULT 0,
  noisy_neighbor_detected boolean NOT NULL DEFAULT false,
  evidence_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolution_status text NOT NULL DEFAULT 'open',
  resolution_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_runtime_contention_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read tenant_runtime_contention_events" ON public.tenant_runtime_contention_events FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert tenant_runtime_contention_events" ON public.tenant_runtime_contention_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_tenant_contention_event() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.severity NOT IN ('low','moderate','high','critical') THEN RAISE EXCEPTION 'Invalid severity: %', NEW.severity; END IF;
  IF NEW.resolution_status NOT IN ('open','mitigated','resolved','escalated') THEN RAISE EXCEPTION 'Invalid resolution_status: %', NEW.resolution_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_tenant_contention_event BEFORE INSERT OR UPDATE ON public.tenant_runtime_contention_events FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_contention_event();

-- 4. tenant_runtime_fairness_reviews
CREATE TABLE public.tenant_runtime_fairness_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  posture_id uuid REFERENCES public.tenant_runtime_postures(id),
  segment_id uuid REFERENCES public.tenant_runtime_segments(id),
  review_type text NOT NULL DEFAULT 'fairness_check',
  review_status text NOT NULL DEFAULT 'pending',
  fairness_score numeric NOT NULL DEFAULT 0.5,
  violations_found int NOT NULL DEFAULT 0,
  review_notes text NOT NULL DEFAULT '',
  reviewer_ref jsonb DEFAULT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_runtime_fairness_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read tenant_runtime_fairness_reviews" ON public.tenant_runtime_fairness_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert tenant_runtime_fairness_reviews" ON public.tenant_runtime_fairness_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update tenant_runtime_fairness_reviews" ON public.tenant_runtime_fairness_reviews FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_tenant_fairness_review() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('pending','reviewed','accepted','rejected','escalated') THEN RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_tenant_fairness_review BEFORE INSERT OR UPDATE ON public.tenant_runtime_fairness_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_fairness_review();
