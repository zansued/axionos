
-- Sprint 35: Autonomous Engineering Advisor tables

-- 1. engineering_advisory_recommendations
CREATE TABLE public.engineering_advisory_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_type text NOT NULL,
  target_scope text NOT NULL,
  target_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_refs jsonb,
  expected_impact jsonb,
  priority_score numeric,
  confidence_score numeric,
  safety_class text NOT NULL DEFAULT 'low_risk_review',
  review_requirements jsonb,
  status text NOT NULL DEFAULT 'open',
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. engineering_advisory_reviews
CREATE TABLE public.engineering_advisory_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES public.engineering_advisory_recommendations(id),
  reviewer_ref jsonb,
  review_status text NOT NULL DEFAULT 'reviewed',
  review_notes text,
  review_reason_codes jsonb,
  linked_changes jsonb,
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. engineering_advisory_scope_profiles
CREATE TABLE public.engineering_advisory_scope_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key text NOT NULL UNIQUE,
  scope_name text NOT NULL,
  scope_type text NOT NULL DEFAULT 'local_runtime',
  required_confidence numeric,
  required_evidence_count integer,
  default_safety_class text NOT NULL DEFAULT 'low_risk_review',
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.engineering_advisory_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineering_advisory_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineering_advisory_scope_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view advisory recommendations" ON public.engineering_advisory_recommendations FOR SELECT TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage advisory recommendations" ON public.engineering_advisory_recommendations FOR ALL TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view advisory reviews" ON public.engineering_advisory_reviews FOR SELECT TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage advisory reviews" ON public.engineering_advisory_reviews FOR ALL TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view advisory scope profiles" ON public.engineering_advisory_scope_profiles FOR SELECT TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage advisory scope profiles" ON public.engineering_advisory_scope_profiles FOR ALL TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_advisory_recommendation()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.safety_class NOT IN ('low_risk_review', 'medium_risk_review', 'high_risk_review') THEN
    RAISE EXCEPTION 'Invalid safety_class: %', NEW.safety_class;
  END IF;
  IF NEW.status NOT IN ('open', 'reviewed', 'accepted', 'rejected', 'implemented', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid advisory recommendation status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_advisory_recommendation BEFORE INSERT OR UPDATE ON public.engineering_advisory_recommendations FOR EACH ROW EXECUTE FUNCTION public.validate_advisory_recommendation();

CREATE OR REPLACE FUNCTION public.validate_advisory_review()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed', 'accepted', 'rejected', 'implemented', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid advisory review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_advisory_review BEFORE INSERT OR UPDATE ON public.engineering_advisory_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_advisory_review();

CREATE OR REPLACE FUNCTION public.validate_advisory_scope_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.scope_type NOT IN ('local_runtime', 'strategy_family', 'policy_family', 'tenant_scope', 'platform_scope') THEN
    RAISE EXCEPTION 'Invalid scope_type: %', NEW.scope_type;
  END IF;
  IF NEW.default_safety_class NOT IN ('low_risk_review', 'medium_risk_review', 'high_risk_review') THEN
    RAISE EXCEPTION 'Invalid default_safety_class: %', NEW.default_safety_class;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_advisory_scope_profile BEFORE INSERT OR UPDATE ON public.engineering_advisory_scope_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_advisory_scope_profile();

-- Performance indexes
CREATE INDEX idx_advisory_recommendations_status ON public.engineering_advisory_recommendations(status);
CREATE INDEX idx_advisory_recommendations_org ON public.engineering_advisory_recommendations(organization_id);
CREATE INDEX idx_advisory_reviews_recommendation ON public.engineering_advisory_reviews(recommendation_id);
CREATE INDEX idx_advisory_scope_profiles_type ON public.engineering_advisory_scope_profiles(scope_type);
