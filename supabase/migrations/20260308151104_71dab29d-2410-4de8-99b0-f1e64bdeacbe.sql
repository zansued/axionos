
-- Sprint 65: Operating Completion Layer
-- 6 tables with full RLS by organization_id

-- 1. operating_completion_models
CREATE TABLE public.operating_completion_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  completion_domain text NOT NULL DEFAULT 'platform',
  completion_scope_type text NOT NULL DEFAULT 'system',
  completion_model_name text NOT NULL DEFAULT '',
  round_enough_criteria jsonb NOT NULL DEFAULT '{}',
  certification_criteria jsonb NOT NULL DEFAULT '{}',
  dimensions jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operating_completion_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_completion_models" ON public.operating_completion_models FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_completion_models" ON public.operating_completion_models FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_completion_models" ON public.operating_completion_models FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_delete_completion_models" ON public.operating_completion_models FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. operating_completion_assessments
CREATE TABLE public.operating_completion_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  model_id uuid REFERENCES public.operating_completion_models(id) ON DELETE SET NULL,
  completion_domain text NOT NULL DEFAULT 'platform',
  completion_scope_type text NOT NULL DEFAULT 'system',
  completion_scope_id text,
  completion_score numeric NOT NULL DEFAULT 0,
  round_enough_score numeric NOT NULL DEFAULT 0,
  governance_maturity_score numeric NOT NULL DEFAULT 0,
  assurance_maturity_score numeric NOT NULL DEFAULT 0,
  canon_integrity_score numeric NOT NULL DEFAULT 0,
  ecosystem_boundedness_score numeric NOT NULL DEFAULT 0,
  pipeline_operability_score numeric NOT NULL DEFAULT 0,
  residual_risk_score numeric NOT NULL DEFAULT 0,
  open_surface_score numeric NOT NULL DEFAULT 0,
  certification_readiness_score numeric NOT NULL DEFAULT 0,
  evidence_links jsonb NOT NULL DEFAULT '[]',
  assumptions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operating_completion_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_completion_assessments" ON public.operating_completion_assessments FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_completion_assessments" ON public.operating_completion_assessments FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_completion_assessments" ON public.operating_completion_assessments FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_delete_completion_assessments" ON public.operating_completion_assessments FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. operating_completion_gaps
CREATE TABLE public.operating_completion_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES public.operating_completion_assessments(id) ON DELETE SET NULL,
  gap_domain text NOT NULL DEFAULT 'platform',
  gap_type text NOT NULL DEFAULT 'unresolved',
  gap_description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'moderate',
  is_intentional boolean NOT NULL DEFAULT false,
  residual_risk_score numeric NOT NULL DEFAULT 0,
  open_surface_score numeric NOT NULL DEFAULT 0,
  evidence_links jsonb NOT NULL DEFAULT '[]',
  rationale text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operating_completion_gaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_completion_gaps" ON public.operating_completion_gaps FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_completion_gaps" ON public.operating_completion_gaps FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_completion_gaps" ON public.operating_completion_gaps FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_delete_completion_gaps" ON public.operating_completion_gaps FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 4. operating_completion_reviews
CREATE TABLE public.operating_completion_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES public.operating_completion_assessments(id) ON DELETE SET NULL,
  review_status text NOT NULL DEFAULT 'pending',
  recommendation_status text NOT NULL DEFAULT 'none',
  reviewer_ref jsonb,
  review_notes text,
  linked_gaps jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operating_completion_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_completion_reviews" ON public.operating_completion_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_completion_reviews" ON public.operating_completion_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_completion_reviews" ON public.operating_completion_reviews FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_delete_completion_reviews" ON public.operating_completion_reviews FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 5. operating_baseline_certifications
CREATE TABLE public.operating_baseline_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  certification_name text NOT NULL DEFAULT '',
  certification_status text NOT NULL DEFAULT 'candidate',
  baseline_snapshot jsonb NOT NULL DEFAULT '{}',
  completion_score numeric NOT NULL DEFAULT 0,
  round_enough_score numeric NOT NULL DEFAULT 0,
  residual_risk_accepted jsonb NOT NULL DEFAULT '[]',
  open_surfaces_accepted jsonb NOT NULL DEFAULT '[]',
  certification_readiness_score numeric NOT NULL DEFAULT 0,
  evidence_links jsonb NOT NULL DEFAULT '[]',
  reviewer_ref jsonb,
  certified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operating_baseline_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_baseline_certs" ON public.operating_baseline_certifications FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_baseline_certs" ON public.operating_baseline_certifications FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_baseline_certs" ON public.operating_baseline_certifications FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_delete_baseline_certs" ON public.operating_baseline_certifications FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 6. operating_completion_outcomes
CREATE TABLE public.operating_completion_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  review_id uuid REFERENCES public.operating_completion_reviews(id) ON DELETE SET NULL,
  certification_id uuid REFERENCES public.operating_baseline_certifications(id) ON DELETE SET NULL,
  expected_outcomes jsonb NOT NULL DEFAULT '{}',
  realized_outcomes jsonb NOT NULL DEFAULT '{}',
  outcome_accuracy_score numeric NOT NULL DEFAULT 0,
  false_positive_flags jsonb NOT NULL DEFAULT '[]',
  baseline_drift_flags jsonb NOT NULL DEFAULT '[]',
  evidence_links jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operating_completion_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_completion_outcomes" ON public.operating_completion_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_completion_outcomes" ON public.operating_completion_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_completion_outcomes" ON public.operating_completion_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_delete_completion_outcomes" ON public.operating_completion_outcomes FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_completion_assessment()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.completion_score < 0 OR NEW.completion_score > 1 THEN RAISE EXCEPTION 'completion_score must be between 0 and 1'; END IF;
  IF NEW.round_enough_score < 0 OR NEW.round_enough_score > 1 THEN RAISE EXCEPTION 'round_enough_score must be between 0 and 1'; END IF;
  RETURN NEW;
END; $function$;

CREATE TRIGGER trg_validate_completion_assessment BEFORE INSERT OR UPDATE ON public.operating_completion_assessments FOR EACH ROW EXECUTE FUNCTION public.validate_completion_assessment();

CREATE OR REPLACE FUNCTION public.validate_completion_gap()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.severity NOT IN ('low','moderate','high','critical') THEN RAISE EXCEPTION 'Invalid severity: %', NEW.severity; END IF;
  IF NEW.gap_type NOT IN ('unresolved','intentional_open','residual_risk','incomplete','blocked') THEN RAISE EXCEPTION 'Invalid gap_type: %', NEW.gap_type; END IF;
  RETURN NEW;
END; $function$;

CREATE TRIGGER trg_validate_completion_gap BEFORE INSERT OR UPDATE ON public.operating_completion_gaps FOR EACH ROW EXECUTE FUNCTION public.validate_completion_gap();

CREATE OR REPLACE FUNCTION public.validate_baseline_certification()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.certification_status NOT IN ('candidate','under_review','certified','rejected','superseded') THEN RAISE EXCEPTION 'Invalid certification_status: %', NEW.certification_status; END IF;
  RETURN NEW;
END; $function$;

CREATE TRIGGER trg_validate_baseline_certification BEFORE INSERT OR UPDATE ON public.operating_baseline_certifications FOR EACH ROW EXECUTE FUNCTION public.validate_baseline_certification();
