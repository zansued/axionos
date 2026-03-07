
-- Sprint 37: Discovery-Driven Architecture Signals

-- 1. Discovery Architecture Signals
CREATE TABLE public.discovery_architecture_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  signal_type text NOT NULL,
  source_type text NOT NULL,
  scope_ref jsonb NULL,
  signal_payload jsonb NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'low',
  confidence_score numeric NULL,
  evidence_refs jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discovery_architecture_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view discovery signals"
  ON public.discovery_architecture_signals FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert discovery signals"
  ON public.discovery_architecture_signals FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Validation trigger for signals
CREATE OR REPLACE FUNCTION public.validate_discovery_architecture_signal()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.source_type NOT IN ('product_usage','tenant_behavior','workflow','support','advisory','platform_intelligence','external_input') THEN
    RAISE EXCEPTION 'Invalid source_type: %', NEW.source_type;
  END IF;
  IF NEW.severity NOT IN ('low','moderate','high','critical') THEN
    RAISE EXCEPTION 'Invalid severity: %', NEW.severity;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_discovery_architecture_signal
  BEFORE INSERT OR UPDATE ON public.discovery_architecture_signals
  FOR EACH ROW EXECUTE FUNCTION public.validate_discovery_architecture_signal();

-- 2. Discovery Architecture Recommendations
CREATE TABLE public.discovery_architecture_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  recommendation_type text NOT NULL,
  target_scope text NOT NULL,
  target_entities jsonb NOT NULL DEFAULT '{}',
  rationale_codes jsonb NOT NULL DEFAULT '[]',
  evidence_refs jsonb NULL,
  expected_impact jsonb NULL,
  confidence_score numeric NULL,
  priority_score numeric NULL,
  safety_class text NOT NULL DEFAULT 'advisory_only',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discovery_architecture_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view discovery recommendations"
  ON public.discovery_architecture_recommendations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert discovery recommendations"
  ON public.discovery_architecture_recommendations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update discovery recommendations"
  ON public.discovery_architecture_recommendations FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Validation trigger for recommendations
CREATE OR REPLACE FUNCTION public.validate_discovery_architecture_recommendation()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.safety_class NOT IN ('advisory_only','high_review_required') THEN
    RAISE EXCEPTION 'Invalid safety_class: %', NEW.safety_class;
  END IF;
  IF NEW.status NOT IN ('open','reviewed','accepted','rejected','implemented','dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_discovery_architecture_recommendation
  BEFORE INSERT OR UPDATE ON public.discovery_architecture_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.validate_discovery_architecture_recommendation();

-- 3. Discovery Architecture Reviews
CREATE TABLE public.discovery_architecture_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  recommendation_id uuid NOT NULL REFERENCES public.discovery_architecture_recommendations(id),
  reviewer_ref jsonb NULL,
  review_status text NOT NULL DEFAULT 'reviewed',
  review_notes text NULL,
  review_reason_codes jsonb NULL,
  linked_changes jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discovery_architecture_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view discovery reviews"
  ON public.discovery_architecture_reviews FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert discovery reviews"
  ON public.discovery_architecture_reviews FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Validation trigger for reviews
CREATE OR REPLACE FUNCTION public.validate_discovery_architecture_review()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed','accepted','rejected','implemented','dismissed') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_discovery_architecture_review
  BEFORE INSERT OR UPDATE ON public.discovery_architecture_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_discovery_architecture_review();
