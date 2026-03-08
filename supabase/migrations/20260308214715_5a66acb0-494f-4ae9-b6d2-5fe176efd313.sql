
-- Sprint 79: Capability Packaging & Registry UX
-- capability_registry_entries already exists from Sprint 61, so we use capability_packages as the new canonical packaging layer

-- 1. Capability Packages (the new packaging concept)
CREATE TABLE public.capability_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  registry_entry_id UUID REFERENCES public.capability_registry_entries(id),
  name TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT '',
  owner_ref JSONB NOT NULL DEFAULT '{}',
  source_type TEXT NOT NULL DEFAULT 'internal',
  affected_surfaces TEXT[] NOT NULL DEFAULT '{}',
  required_scopes TEXT[] NOT NULL DEFAULT '{}',
  compatibility_posture JSONB NOT NULL DEFAULT '{}',
  rollback_ready BOOLEAN NOT NULL DEFAULT false,
  risk_posture TEXT NOT NULL DEFAULT 'low',
  lifecycle_status TEXT NOT NULL DEFAULT 'draft',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Capability Package Versions
CREATE TABLE public.capability_package_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.capability_packages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  version_label TEXT NOT NULL DEFAULT '0.1.0',
  changelog TEXT NOT NULL DEFAULT '',
  package_payload JSONB NOT NULL DEFAULT '{}',
  compatibility_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Capability Package Events (audit trail for packaging lifecycle)
CREATE TABLE public.capability_package_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.capability_packages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  event_type TEXT NOT NULL DEFAULT '',
  actor_ref JSONB NOT NULL DEFAULT '{}',
  event_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.capability_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capability_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capability_package_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage capability_packages" ON public.capability_packages FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members manage capability_package_versions" ON public.capability_package_versions FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members manage capability_package_events" ON public.capability_package_events FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_capability_package_lifecycle()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lifecycle_status NOT IN ('draft','registered','active','paused','deprecated','archived') THEN
    RAISE EXCEPTION 'Invalid lifecycle_status: %', NEW.lifecycle_status;
  END IF;
  IF NEW.risk_posture NOT IN ('low','moderate','high','critical') THEN
    RAISE EXCEPTION 'Invalid risk_posture: %', NEW.risk_posture;
  END IF;
  IF NEW.source_type NOT IN ('internal','extension','partner','experimental') THEN
    RAISE EXCEPTION 'Invalid source_type: %', NEW.source_type;
  END IF;
  IF NEW.category NOT IN ('general','agent','pipeline','governance','intelligence','integration','validation','delivery') THEN
    RAISE EXCEPTION 'Invalid category: %', NEW.category;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_capability_package_lifecycle BEFORE INSERT OR UPDATE ON public.capability_packages FOR EACH ROW EXECUTE FUNCTION public.validate_capability_package_lifecycle();
