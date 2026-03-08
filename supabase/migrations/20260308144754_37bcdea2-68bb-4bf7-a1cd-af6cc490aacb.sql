
-- Sprint 63: Institutional Outcome Assurance Layer

-- 1. institutional_outcome_models
CREATE TABLE public.institutional_outcome_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  outcome_domain text NOT NULL DEFAULT 'pipeline',
  outcome_scope_type text NOT NULL DEFAULT 'global',
  outcome_model_name text NOT NULL,
  expected_outcome_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  assurance_dimensions jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.institutional_outcome_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_outcome_models" ON public.institutional_outcome_models FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_outcome_models" ON public.institutional_outcome_models FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_outcome_models" ON public.institutional_outcome_models FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. institutional_outcome_assessments
CREATE TABLE public.institutional_outcome_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id uuid REFERENCES public.institutional_outcome_models(id) ON DELETE SET NULL,
  outcome_domain text NOT NULL DEFAULT 'pipeline',
  outcome_scope_type text NOT NULL DEFAULT 'global',
  outcome_scope_id text NOT NULL DEFAULT '',
  expected_outcome_score numeric NOT NULL DEFAULT 0,
  realized_outcome_score numeric NOT NULL DEFAULT 0,
  outcome_variance_score numeric NOT NULL DEFAULT 0,
  assurance_confidence_score numeric NOT NULL DEFAULT 0,
  evidence_density_score numeric NOT NULL DEFAULT 0,
  stability_score numeric NOT NULL DEFAULT 0,
  drift_score numeric NOT NULL DEFAULT 0,
  institutional_risk_score numeric NOT NULL DEFAULT 0,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.institutional_outcome_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_outcome_assessments" ON public.institutional_outcome_assessments FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_outcome_assessments" ON public.institutional_outcome_assessments FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_outcome_assessments" ON public.institutional_outcome_assessments FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. institutional_outcome_variances
CREATE TABLE public.institutional_outcome_variances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.institutional_outcome_assessments(id) ON DELETE CASCADE,
  outcome_domain text NOT NULL DEFAULT 'pipeline',
  variance_type text NOT NULL DEFAULT 'underperformance',
  drift_score numeric NOT NULL DEFAULT 0,
  fragility_score numeric NOT NULL DEFAULT 0,
  recurrence_count integer NOT NULL DEFAULT 1,
  remediation_priority_score numeric NOT NULL DEFAULT 0,
  rationale text NOT NULL DEFAULT '',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.institutional_outcome_variances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_outcome_variances" ON public.institutional_outcome_variances FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_outcome_variances" ON public.institutional_outcome_variances FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. institutional_assurance_reviews
CREATE TABLE public.institutional_assurance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.institutional_outcome_assessments(id) ON DELETE CASCADE,
  review_status text NOT NULL DEFAULT 'pending',
  reviewer_ref jsonb DEFAULT NULL,
  review_notes text NOT NULL DEFAULT '',
  recommendation_status text NOT NULL DEFAULT 'monitor',
  linked_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.institutional_assurance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_assurance_reviews" ON public.institutional_assurance_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_assurance_reviews" ON public.institutional_assurance_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_assurance_reviews" ON public.institutional_assurance_reviews FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 5. institutional_assurance_signals
CREATE TABLE public.institutional_assurance_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_layer text NOT NULL DEFAULT 'pipeline',
  signal_type text NOT NULL DEFAULT 'assurance',
  cross_layer_assurance_score numeric NOT NULL DEFAULT 0,
  stability_score numeric NOT NULL DEFAULT 0,
  evidence_density_score numeric NOT NULL DEFAULT 0,
  signal_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.institutional_assurance_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_assurance_signals" ON public.institutional_assurance_signals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_assurance_signals" ON public.institutional_assurance_signals FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 6. institutional_outcome_assurance_outcomes
CREATE TABLE public.institutional_outcome_assurance_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  review_id uuid REFERENCES public.institutional_assurance_reviews(id) ON DELETE CASCADE,
  outcome_type text NOT NULL DEFAULT 'unknown',
  assurance_outcome_accuracy_score numeric NOT NULL DEFAULT 0,
  bounded_remediation_readiness_score numeric NOT NULL DEFAULT 0,
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_status text NOT NULL DEFAULT 'pending',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.institutional_outcome_assurance_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_ioa_outcomes" ON public.institutional_outcome_assurance_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_ioa_outcomes" ON public.institutional_outcome_assurance_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_ioa_outcomes" ON public.institutional_outcome_assurance_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_assurance_review_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('pending','under_review','reviewed','resolved','dismissed') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  IF NEW.recommendation_status NOT IN ('stable','monitor','needs_review','high_variance','remediation_candidate') THEN
    RAISE EXCEPTION 'Invalid recommendation_status: %', NEW.recommendation_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_assurance_review BEFORE INSERT OR UPDATE ON public.institutional_assurance_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_assurance_review_status();

CREATE OR REPLACE FUNCTION public.validate_ioa_outcome_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_ioa_outcome BEFORE INSERT OR UPDATE ON public.institutional_outcome_assurance_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_ioa_outcome_status();
