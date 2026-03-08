
-- Sprint 80: Trust, Entitlements & Approval Flows

-- 1. Capability Trust Postures
CREATE TABLE public.capability_trust_postures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  capability_package_id UUID NOT NULL REFERENCES public.capability_packages(id) ON DELETE CASCADE,
  trust_level TEXT NOT NULL DEFAULT 'restricted',
  risk_posture TEXT NOT NULL DEFAULT 'medium',
  review_notes TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_trust_postures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view trust postures"
  ON public.capability_trust_postures FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage trust postures"
  ON public.capability_trust_postures FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

CREATE OR REPLACE FUNCTION public.validate_capability_trust_posture()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.trust_level NOT IN ('internal_trusted', 'operator_reviewed', 'restricted', 'partner_pilot', 'high_risk_governed', 'suspended') THEN
    RAISE EXCEPTION 'Invalid trust_level: %', NEW.trust_level;
  END IF;
  IF NEW.risk_posture NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid risk_posture: %', NEW.risk_posture;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_capability_trust_posture
  BEFORE INSERT OR UPDATE ON public.capability_trust_postures
  FOR EACH ROW EXECUTE FUNCTION public.validate_capability_trust_posture();

-- 2. Capability Entitlements
CREATE TABLE public.capability_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  capability_package_id UUID NOT NULL REFERENCES public.capability_packages(id) ON DELETE CASCADE,
  principal_type TEXT NOT NULL DEFAULT 'organization',
  principal_id TEXT NOT NULL DEFAULT '',
  access_level TEXT NOT NULL DEFAULT 'read',
  entitlement_status TEXT NOT NULL DEFAULT 'pending',
  approval_required BOOLEAN NOT NULL DEFAULT true,
  granted_by TEXT NOT NULL DEFAULT '',
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  review_metadata JSONB NOT NULL DEFAULT '{}',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view entitlements"
  ON public.capability_entitlements FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage entitlements"
  ON public.capability_entitlements FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

CREATE OR REPLACE FUNCTION public.validate_capability_entitlement()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.entitlement_status NOT IN ('pending', 'active', 'suspended', 'revoked', 'expired') THEN
    RAISE EXCEPTION 'Invalid entitlement_status: %', NEW.entitlement_status;
  END IF;
  IF NEW.access_level NOT IN ('read', 'use', 'configure', 'admin') THEN
    RAISE EXCEPTION 'Invalid access_level: %', NEW.access_level;
  END IF;
  IF NEW.principal_type NOT IN ('organization', 'workspace', 'role', 'user') THEN
    RAISE EXCEPTION 'Invalid principal_type: %', NEW.principal_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_capability_entitlement
  BEFORE INSERT OR UPDATE ON public.capability_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.validate_capability_entitlement();

-- 3. Capability Access Requests
CREATE TABLE public.capability_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  capability_package_id UUID NOT NULL REFERENCES public.capability_packages(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL DEFAULT '',
  request_reason TEXT NOT NULL DEFAULT '',
  requested_access_level TEXT NOT NULL DEFAULT 'use',
  request_status TEXT NOT NULL DEFAULT 'pending',
  resolved_by TEXT NOT NULL DEFAULT '',
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT NOT NULL DEFAULT '',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view access requests"
  ON public.capability_access_requests FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create access requests"
  ON public.capability_access_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage access requests"
  ON public.capability_access_requests FOR UPDATE TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

CREATE OR REPLACE FUNCTION public.validate_capability_access_request()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.request_status NOT IN ('pending', 'approved', 'rejected', 'suspended', 'revoked') THEN
    RAISE EXCEPTION 'Invalid request_status: %', NEW.request_status;
  END IF;
  IF NEW.requested_access_level NOT IN ('read', 'use', 'configure', 'admin') THEN
    RAISE EXCEPTION 'Invalid requested_access_level: %', NEW.requested_access_level;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_capability_access_request
  BEFORE INSERT OR UPDATE ON public.capability_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_capability_access_request();

-- 4. Capability Approval Reviews
CREATE TABLE public.capability_approval_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.capability_access_requests(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL DEFAULT '',
  review_action TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT NOT NULL DEFAULT '',
  conditions JSONB NOT NULL DEFAULT '[]',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_approval_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view approval reviews"
  ON public.capability_approval_reviews FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage approval reviews"
  ON public.capability_approval_reviews FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

CREATE OR REPLACE FUNCTION public.validate_capability_approval_review()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_action NOT IN ('pending', 'approved', 'rejected', 'suspended', 'revoked') THEN
    RAISE EXCEPTION 'Invalid review_action: %', NEW.review_action;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_capability_approval_review
  BEFORE INSERT OR UPDATE ON public.capability_approval_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_capability_approval_review();
