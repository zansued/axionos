
-- Sprint 82: Outcome-Aware Capability Marketplace

-- 1. Capability Outcome Postures
CREATE TABLE public.capability_outcome_postures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  capability_package_id UUID NOT NULL REFERENCES public.capability_packages(id) ON DELETE CASCADE,
  health_score NUMERIC NOT NULL DEFAULT 0.5,
  compatibility_confidence NUMERIC NOT NULL DEFAULT 0.5,
  reliability_score NUMERIC NOT NULL DEFAULT 0.5,
  rollback_readiness TEXT NOT NULL DEFAULT 'unknown',
  risk_posture TEXT NOT NULL DEFAULT 'medium',
  usage_signal JSONB NOT NULL DEFAULT '{}',
  review_summary TEXT NOT NULL DEFAULT '',
  standing TEXT NOT NULL DEFAULT 'visible',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.capability_outcome_postures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view outcome postures" ON public.capability_outcome_postures FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage outcome postures" ON public.capability_outcome_postures FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin')) WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE OR REPLACE FUNCTION public.validate_capability_outcome_posture() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rollback_readiness NOT IN ('unknown','ready','partial','not_ready') THEN RAISE EXCEPTION 'Invalid rollback_readiness: %', NEW.rollback_readiness; END IF;
  IF NEW.risk_posture NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid risk_posture: %', NEW.risk_posture; END IF;
  IF NEW.standing NOT IN ('visible','high_confidence','restricted','downgraded','suspended') THEN RAISE EXCEPTION 'Invalid standing: %', NEW.standing; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_capability_outcome_posture BEFORE INSERT OR UPDATE ON public.capability_outcome_postures FOR EACH ROW EXECUTE FUNCTION public.validate_capability_outcome_posture();

-- 2. Capability Marketplace Signals
CREATE TABLE public.capability_marketplace_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  capability_package_id UUID NOT NULL REFERENCES public.capability_packages(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL DEFAULT 'observation',
  signal_source TEXT NOT NULL DEFAULT 'internal',
  signal_payload JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.capability_marketplace_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view signals" ON public.capability_marketplace_signals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage signals" ON public.capability_marketplace_signals FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin')) WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE OR REPLACE FUNCTION public.validate_capability_marketplace_signal() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.signal_type NOT IN ('observation','compatibility_issue','rollback_event','reliability_drop','risk_escalation','adoption_signal') THEN RAISE EXCEPTION 'Invalid signal_type: %', NEW.signal_type; END IF;
  IF NEW.severity NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid severity: %', NEW.severity; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_capability_marketplace_signal BEFORE INSERT OR UPDATE ON public.capability_marketplace_signals FOR EACH ROW EXECUTE FUNCTION public.validate_capability_marketplace_signal();

-- 3. Capability Marketplace Reviews
CREATE TABLE public.capability_marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  posture_id UUID NOT NULL REFERENCES public.capability_outcome_postures(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL DEFAULT '',
  review_action TEXT NOT NULL DEFAULT 'keep_visible',
  review_notes TEXT NOT NULL DEFAULT '',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.capability_marketplace_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view mkt reviews" ON public.capability_marketplace_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage mkt reviews" ON public.capability_marketplace_reviews FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin')) WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE OR REPLACE FUNCTION public.validate_capability_marketplace_review() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_action NOT IN ('keep_visible','mark_high_confidence','downgrade','restrict','suspend') THEN RAISE EXCEPTION 'Invalid review_action: %', NEW.review_action; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_capability_marketplace_review BEFORE INSERT OR UPDATE ON public.capability_marketplace_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_capability_marketplace_review();

-- 4. Capability Marketplace Decisions
CREATE TABLE public.capability_marketplace_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  capability_package_id UUID NOT NULL REFERENCES public.capability_packages(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL DEFAULT 'keep_visible',
  decided_by TEXT NOT NULL DEFAULT '',
  decision_reason TEXT NOT NULL DEFAULT '',
  previous_standing TEXT NOT NULL DEFAULT 'visible',
  new_standing TEXT NOT NULL DEFAULT 'visible',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.capability_marketplace_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view mkt decisions" ON public.capability_marketplace_decisions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage mkt decisions" ON public.capability_marketplace_decisions FOR ALL TO authenticated USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin')) WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE OR REPLACE FUNCTION public.validate_capability_marketplace_decision() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.decision_type NOT IN ('keep_visible','mark_high_confidence','downgrade','restrict','suspend') THEN RAISE EXCEPTION 'Invalid decision_type: %', NEW.decision_type; END IF;
  IF NEW.previous_standing NOT IN ('visible','high_confidence','restricted','downgraded','suspended') THEN RAISE EXCEPTION 'Invalid previous_standing: %', NEW.previous_standing; END IF;
  IF NEW.new_standing NOT IN ('visible','high_confidence','restricted','downgraded','suspended') THEN RAISE EXCEPTION 'Invalid new_standing: %', NEW.new_standing; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_capability_marketplace_decision BEFORE INSERT OR UPDATE ON public.capability_marketplace_decisions FOR EACH ROW EXECUTE FUNCTION public.validate_capability_marketplace_decision();
