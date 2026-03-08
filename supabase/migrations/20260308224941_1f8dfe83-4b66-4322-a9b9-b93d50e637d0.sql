
-- Sprint 86: Outcome Assurance 2.0

-- 1. outcome_assurance_postures — core assurance synthesis records
CREATE TABLE public.outcome_assurance_postures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  initiative_id UUID REFERENCES public.initiatives(id),
  posture_label TEXT NOT NULL DEFAULT 'unnamed',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  readiness_score NUMERIC NOT NULL DEFAULT 0,
  reliability_score NUMERIC NOT NULL DEFAULT 0,
  risk_score NUMERIC NOT NULL DEFAULT 0,
  uncertainty_score NUMERIC NOT NULL DEFAULT 0,
  blocker_count INTEGER NOT NULL DEFAULT 0,
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_summary TEXT NOT NULL DEFAULT '',
  posture_status TEXT NOT NULL DEFAULT 'pending',
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outcome_assurance_postures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_outcome_assurance_postures" ON public.outcome_assurance_postures
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_insert_outcome_assurance_postures" ON public.outcome_assurance_postures
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_update_outcome_assurance_postures" ON public.outcome_assurance_postures
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_outcome_assurance_posture()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.posture_status NOT IN ('pending','assessed','reviewed','accepted','flagged','archived') THEN
    RAISE EXCEPTION 'Invalid posture_status: %', NEW.posture_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_outcome_assurance_posture
  BEFORE INSERT OR UPDATE ON public.outcome_assurance_postures
  FOR EACH ROW EXECUTE FUNCTION public.validate_outcome_assurance_posture();

-- 2. outcome_assurance_factors — contributing factors to assurance posture
CREATE TABLE public.outcome_assurance_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  posture_id UUID NOT NULL REFERENCES public.outcome_assurance_postures(id) ON DELETE CASCADE,
  factor_type TEXT NOT NULL DEFAULT 'unknown',
  factor_label TEXT NOT NULL DEFAULT '',
  factor_direction TEXT NOT NULL DEFAULT 'neutral',
  weight NUMERIC NOT NULL DEFAULT 0.5,
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outcome_assurance_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_outcome_assurance_factors" ON public.outcome_assurance_factors
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_insert_outcome_assurance_factors" ON public.outcome_assurance_factors
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Factor direction validation
CREATE OR REPLACE FUNCTION public.validate_outcome_assurance_factor()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.factor_direction NOT IN ('positive','negative','neutral','uncertain') THEN
    RAISE EXCEPTION 'Invalid factor_direction: %', NEW.factor_direction;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_outcome_assurance_factor
  BEFORE INSERT OR UPDATE ON public.outcome_assurance_factors
  FOR EACH ROW EXECUTE FUNCTION public.validate_outcome_assurance_factor();

-- 3. outcome_assurance_reviews — audit trail for operator review
CREATE TABLE public.outcome_assurance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  posture_id UUID NOT NULL REFERENCES public.outcome_assurance_postures(id) ON DELETE CASCADE,
  review_status TEXT NOT NULL DEFAULT 'reviewed',
  review_notes TEXT NOT NULL DEFAULT '',
  reviewer_ref JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outcome_assurance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_outcome_assurance_reviews" ON public.outcome_assurance_reviews
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_insert_outcome_assurance_reviews" ON public.outcome_assurance_reviews
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_outcome_assurance_review()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed','accepted','flagged','dismissed','archived') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_outcome_assurance_review
  BEFORE INSERT OR UPDATE ON public.outcome_assurance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_outcome_assurance_review();

-- 4. outcome_assurance_recommendations — actionable recommendations
CREATE TABLE public.outcome_assurance_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  posture_id UUID NOT NULL REFERENCES public.outcome_assurance_postures(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL DEFAULT 'advisory',
  recommendation_text TEXT NOT NULL DEFAULT '',
  priority_score NUMERIC NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'open',
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outcome_assurance_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_outcome_assurance_recommendations" ON public.outcome_assurance_recommendations
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_insert_outcome_assurance_recommendations" ON public.outcome_assurance_recommendations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_update_outcome_assurance_recommendations" ON public.outcome_assurance_recommendations
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_outcome_assurance_recommendation()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','reviewed','accepted','rejected','dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_outcome_assurance_recommendation
  BEFORE INSERT OR UPDATE ON public.outcome_assurance_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.validate_outcome_assurance_recommendation();
