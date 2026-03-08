
-- Sprint 85: Reliability-Aware Delivery Tuning

-- 1. delivery_reliability_postures
CREATE TABLE public.delivery_reliability_postures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  posture_label TEXT NOT NULL DEFAULT '',
  reliability_score NUMERIC NOT NULL DEFAULT 0.5,
  regression_frequency NUMERIC NOT NULL DEFAULT 0.0,
  rollback_frequency NUMERIC NOT NULL DEFAULT 0.0,
  validation_stability NUMERIC NOT NULL DEFAULT 0.5,
  delivery_confidence NUMERIC NOT NULL DEFAULT 0.5,
  risk_posture TEXT NOT NULL DEFAULT 'moderate',
  posture_context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_reliability_postures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage delivery_reliability_postures" ON public.delivery_reliability_postures
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_delivery_reliability_posture() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.risk_posture NOT IN ('low','moderate','high','critical') THEN RAISE EXCEPTION 'Invalid risk_posture: %', NEW.risk_posture; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_delivery_reliability_posture BEFORE INSERT OR UPDATE ON public.delivery_reliability_postures FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_reliability_posture();

-- 2. delivery_tuning_signals
CREATE TABLE public.delivery_tuning_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  posture_id UUID REFERENCES public.delivery_reliability_postures(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL DEFAULT 'regression_pattern',
  severity TEXT NOT NULL DEFAULT 'moderate',
  signal_summary TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_tuning_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage delivery_tuning_signals" ON public.delivery_tuning_signals
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_delivery_tuning_signal() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.signal_type NOT IN ('regression_pattern','rollback_pattern','validation_instability','benchmark_decline','post_deploy_friction','capability_risk','coordination_complexity') THEN RAISE EXCEPTION 'Invalid signal_type: %', NEW.signal_type; END IF;
  IF NEW.severity NOT IN ('low','moderate','high','critical') THEN RAISE EXCEPTION 'Invalid severity: %', NEW.severity; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_delivery_tuning_signal BEFORE INSERT OR UPDATE ON public.delivery_tuning_signals FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_tuning_signal();

-- 3. delivery_tuning_recommendations
CREATE TABLE public.delivery_tuning_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  posture_id UUID REFERENCES public.delivery_reliability_postures(id) ON DELETE SET NULL,
  tuning_target TEXT NOT NULL DEFAULT '',
  reliability_rationale TEXT NOT NULL DEFAULT '',
  expected_benefit TEXT NOT NULL DEFAULT '',
  trade_off_posture TEXT NOT NULL DEFAULT 'balanced',
  risk_posture TEXT NOT NULL DEFAULT 'moderate',
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  uncertainty_notes TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_tuning_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage delivery_tuning_recommendations" ON public.delivery_tuning_recommendations
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_delivery_tuning_recommendation() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.trade_off_posture NOT IN ('speed_favored','balanced','reliability_favored','safety_first') THEN RAISE EXCEPTION 'Invalid trade_off_posture: %', NEW.trade_off_posture; END IF;
  IF NEW.risk_posture NOT IN ('low','moderate','high','critical') THEN RAISE EXCEPTION 'Invalid risk_posture: %', NEW.risk_posture; END IF;
  IF NEW.status NOT IN ('open','reviewed','accepted','trial','rejected','rolled_back','dismissed') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_delivery_tuning_recommendation BEFORE INSERT OR UPDATE ON public.delivery_tuning_recommendations FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_tuning_recommendation();

-- 4. delivery_tuning_reviews
CREATE TABLE public.delivery_tuning_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES public.delivery_tuning_recommendations(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  review_action TEXT NOT NULL DEFAULT 'reviewed',
  review_notes TEXT NOT NULL DEFAULT '',
  previous_status TEXT NOT NULL DEFAULT '',
  new_status TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_tuning_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage delivery_tuning_reviews" ON public.delivery_tuning_reviews
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_delivery_tuning_review() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_action NOT IN ('reviewed','accept','accept_for_trial','reject','dismiss','rollback') THEN RAISE EXCEPTION 'Invalid review_action: %', NEW.review_action; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_delivery_tuning_review BEFORE INSERT OR UPDATE ON public.delivery_tuning_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_tuning_review();
