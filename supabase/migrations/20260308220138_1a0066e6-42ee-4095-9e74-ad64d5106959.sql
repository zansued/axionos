
-- Sprint 81: Creator / Partner Pilot Marketplace

-- 1. Ecosystem Participants
CREATE TABLE public.ecosystem_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL DEFAULT '',
  participant_type TEXT NOT NULL DEFAULT 'partner',
  trust_status TEXT NOT NULL DEFAULT 'pending_review',
  participation_status TEXT NOT NULL DEFAULT 'pending',
  contact_info JSONB NOT NULL DEFAULT '{}',
  review_posture TEXT NOT NULL DEFAULT 'standard',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecosystem_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view participants" ON public.ecosystem_participants FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage participants" ON public.ecosystem_participants FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin')) WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE OR REPLACE FUNCTION public.validate_ecosystem_participant() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.participant_type NOT IN ('partner','creator','internal','vendor') THEN RAISE EXCEPTION 'Invalid participant_type: %', NEW.participant_type; END IF;
  IF NEW.trust_status NOT IN ('pending_review','trusted','restricted','suspended','blocked') THEN RAISE EXCEPTION 'Invalid trust_status: %', NEW.trust_status; END IF;
  IF NEW.participation_status NOT IN ('pending','active','suspended','withdrawn','blocked') THEN RAISE EXCEPTION 'Invalid participation_status: %', NEW.participation_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_ecosystem_participant BEFORE INSERT OR UPDATE ON public.ecosystem_participants FOR EACH ROW EXECUTE FUNCTION public.validate_ecosystem_participant();

-- 2. Pilot Capability Submissions
CREATE TABLE public.pilot_capability_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.ecosystem_participants(id) ON DELETE CASCADE,
  capability_package_id UUID REFERENCES public.capability_packages(id) ON DELETE SET NULL,
  submission_name TEXT NOT NULL DEFAULT '',
  submission_description TEXT NOT NULL DEFAULT '',
  compatibility_posture TEXT NOT NULL DEFAULT 'unknown',
  risk_posture TEXT NOT NULL DEFAULT 'medium',
  rollback_ready BOOLEAN NOT NULL DEFAULT false,
  submission_status TEXT NOT NULL DEFAULT 'draft',
  affected_surfaces JSONB NOT NULL DEFAULT '[]',
  submission_payload JSONB NOT NULL DEFAULT '{}',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pilot_capability_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view submissions" ON public.pilot_capability_submissions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage submissions" ON public.pilot_capability_submissions FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin')) WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE OR REPLACE FUNCTION public.validate_pilot_submission() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.submission_status NOT IN ('draft','submitted','under_review','approved','rejected','suspended','withdrawn') THEN RAISE EXCEPTION 'Invalid submission_status: %', NEW.submission_status; END IF;
  IF NEW.compatibility_posture NOT IN ('unknown','compatible','partial','incompatible') THEN RAISE EXCEPTION 'Invalid compatibility_posture: %', NEW.compatibility_posture; END IF;
  IF NEW.risk_posture NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid risk_posture: %', NEW.risk_posture; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_pilot_submission BEFORE INSERT OR UPDATE ON public.pilot_capability_submissions FOR EACH ROW EXECUTE FUNCTION public.validate_pilot_submission();

-- 3. Pilot Marketplace Reviews
CREATE TABLE public.pilot_marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.pilot_capability_submissions(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL DEFAULT '',
  review_action TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT NOT NULL DEFAULT '',
  compatibility_assessment JSONB NOT NULL DEFAULT '{}',
  risk_assessment JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '[]',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pilot_marketplace_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view reviews" ON public.pilot_marketplace_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage reviews" ON public.pilot_marketplace_reviews FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin')) WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE OR REPLACE FUNCTION public.validate_pilot_marketplace_review() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_action NOT IN ('pending','approved','rejected','suspended','needs_changes') THEN RAISE EXCEPTION 'Invalid review_action: %', NEW.review_action; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_pilot_marketplace_review BEFORE INSERT OR UPDATE ON public.pilot_marketplace_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_pilot_marketplace_review();

-- 4. Pilot Marketplace Exposure
CREATE TABLE public.pilot_marketplace_exposure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.pilot_capability_submissions(id) ON DELETE CASCADE,
  exposure_status TEXT NOT NULL DEFAULT 'not_exposed',
  exposure_scope TEXT NOT NULL DEFAULT 'internal_only',
  exposed_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pilot_marketplace_exposure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view exposure" ON public.pilot_marketplace_exposure FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage exposure" ON public.pilot_marketplace_exposure FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin')) WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE OR REPLACE FUNCTION public.validate_pilot_marketplace_exposure() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.exposure_status NOT IN ('not_exposed','pilot_active','pilot_paused','pilot_completed','withdrawn') THEN RAISE EXCEPTION 'Invalid exposure_status: %', NEW.exposure_status; END IF;
  IF NEW.exposure_scope NOT IN ('internal_only','limited_tenants','curated_preview') THEN RAISE EXCEPTION 'Invalid exposure_scope: %', NEW.exposure_scope; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_pilot_marketplace_exposure BEFORE INSERT OR UPDATE ON public.pilot_marketplace_exposure FOR EACH ROW EXECUTE FUNCTION public.validate_pilot_marketplace_exposure();
