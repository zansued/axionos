
-- Sprint 83: Delivery Outcome Causality Layer

-- 1. delivery_outcome_records
CREATE TABLE public.delivery_outcome_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  outcome_type TEXT NOT NULL DEFAULT 'delivery',
  outcome_status TEXT NOT NULL DEFAULT 'analyzed',
  outcome_summary TEXT NOT NULL DEFAULT '',
  outcome_metrics JSONB NOT NULL DEFAULT '{}',
  delivery_context JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  uncertainty_notes TEXT NOT NULL DEFAULT '',
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_outcome_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage delivery_outcome_records" ON public.delivery_outcome_records
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_delivery_outcome_record() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_type NOT IN ('delivery','rollback','failure','partial','degraded') THEN RAISE EXCEPTION 'Invalid outcome_type: %', NEW.outcome_type; END IF;
  IF NEW.analysis_status NOT IN ('pending','analyzed','reviewed','low_confidence','dismissed') THEN RAISE EXCEPTION 'Invalid analysis_status: %', NEW.analysis_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_delivery_outcome_record BEFORE INSERT OR UPDATE ON public.delivery_outcome_records FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_outcome_record();

-- 2. delivery_outcome_factors
CREATE TABLE public.delivery_outcome_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES public.delivery_outcome_records(id) ON DELETE CASCADE,
  factor_type TEXT NOT NULL DEFAULT 'architecture_choice',
  factor_label TEXT NOT NULL DEFAULT '',
  factor_direction TEXT NOT NULL DEFAULT 'positive',
  contribution_weight NUMERIC NOT NULL DEFAULT 0.5,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  uncertainty_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_outcome_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage delivery_outcome_factors" ON public.delivery_outcome_factors
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_delivery_outcome_factor() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.factor_type NOT IN ('architecture_choice','validation_pattern','rollback_event','repair_strategy','capability_participation','coordination_posture','deployment_condition','project_friction','governance_decision') THEN RAISE EXCEPTION 'Invalid factor_type: %', NEW.factor_type; END IF;
  IF NEW.factor_direction NOT IN ('positive','negative','neutral','uncertain') THEN RAISE EXCEPTION 'Invalid factor_direction: %', NEW.factor_direction; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_delivery_outcome_factor BEFORE INSERT OR UPDATE ON public.delivery_outcome_factors FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_outcome_factor();

-- 3. delivery_outcome_causality_links
CREATE TABLE public.delivery_outcome_causality_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES public.delivery_outcome_records(id) ON DELETE CASCADE,
  factor_id UUID NOT NULL REFERENCES public.delivery_outcome_factors(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'contributing',
  link_strength TEXT NOT NULL DEFAULT 'moderate',
  supporting_signals JSONB NOT NULL DEFAULT '[]',
  counterfactors JSONB NOT NULL DEFAULT '[]',
  confidence_posture TEXT NOT NULL DEFAULT 'moderate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_outcome_causality_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage delivery_outcome_causality_links" ON public.delivery_outcome_causality_links
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_delivery_outcome_causality_link() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.link_type NOT IN ('contributing','blocking','accelerating','mitigating','counterfactual') THEN RAISE EXCEPTION 'Invalid link_type: %', NEW.link_type; END IF;
  IF NEW.link_strength NOT IN ('weak','moderate','strong','very_strong') THEN RAISE EXCEPTION 'Invalid link_strength: %', NEW.link_strength; END IF;
  IF NEW.confidence_posture NOT IN ('low','moderate','high','very_high') THEN RAISE EXCEPTION 'Invalid confidence_posture: %', NEW.confidence_posture; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_delivery_outcome_causality_link BEFORE INSERT OR UPDATE ON public.delivery_outcome_causality_links FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_outcome_causality_link();

-- 4. delivery_outcome_analysis_reviews
CREATE TABLE public.delivery_outcome_analysis_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES public.delivery_outcome_records(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  review_action TEXT NOT NULL DEFAULT 'reviewed',
  review_notes TEXT NOT NULL DEFAULT '',
  previous_status TEXT NOT NULL DEFAULT '',
  new_status TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_outcome_analysis_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage delivery_outcome_analysis_reviews" ON public.delivery_outcome_analysis_reviews
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_delivery_outcome_analysis_review() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_action NOT IN ('reviewed','mark_low_confidence','dismiss','confirm','escalate') THEN RAISE EXCEPTION 'Invalid review_action: %', NEW.review_action; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_delivery_outcome_analysis_review BEFORE INSERT OR UPDATE ON public.delivery_outcome_analysis_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_outcome_analysis_review();
