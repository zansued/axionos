
-- Sprint 64: Canon Integrity & Drift Governance Layer

-- 1. canon_integrity_models
CREATE TABLE public.canon_integrity_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  integrity_domain text NOT NULL DEFAULT 'documentation',
  integrity_scope_type text NOT NULL DEFAULT 'global',
  canonical_source_name text NOT NULL,
  canonical_source_type text NOT NULL DEFAULT 'document',
  integrity_check_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_of_truth_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_integrity_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_canon_models" ON public.canon_integrity_models FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_canon_models" ON public.canon_integrity_models FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_canon_models" ON public.canon_integrity_models FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. canon_integrity_assessments
CREATE TABLE public.canon_integrity_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id uuid REFERENCES public.canon_integrity_models(id) ON DELETE SET NULL,
  integrity_domain text NOT NULL DEFAULT 'documentation',
  integrity_scope_type text NOT NULL DEFAULT 'global',
  integrity_scope_id text NOT NULL DEFAULT '',
  conformance_score numeric NOT NULL DEFAULT 0,
  drift_score numeric NOT NULL DEFAULT 0,
  inconsistency_score numeric NOT NULL DEFAULT 0,
  principle_alignment_score numeric NOT NULL DEFAULT 0,
  mutation_boundary_integrity_score numeric NOT NULL DEFAULT 0,
  cross_doc_consistency_score numeric NOT NULL DEFAULT 0,
  architecture_canon_alignment_score numeric NOT NULL DEFAULT 0,
  governance_canon_alignment_score numeric NOT NULL DEFAULT 0,
  operational_conformance_score numeric NOT NULL DEFAULT 0,
  integrity_risk_score numeric NOT NULL DEFAULT 0,
  remediation_priority_score numeric NOT NULL DEFAULT 0,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_integrity_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_canon_assessments" ON public.canon_integrity_assessments FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_canon_assessments" ON public.canon_integrity_assessments FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_canon_assessments" ON public.canon_integrity_assessments FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. canon_drift_events
CREATE TABLE public.canon_drift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.canon_integrity_assessments(id) ON DELETE CASCADE,
  integrity_domain text NOT NULL DEFAULT 'documentation',
  drift_type text NOT NULL DEFAULT 'inconsistency',
  drift_score numeric NOT NULL DEFAULT 0,
  principle_violated text NOT NULL DEFAULT '',
  recurrence_count integer NOT NULL DEFAULT 1,
  severity text NOT NULL DEFAULT 'low',
  description text NOT NULL DEFAULT '',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_drift_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_canon_drift" ON public.canon_drift_events FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_canon_drift" ON public.canon_drift_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. canon_integrity_reviews
CREATE TABLE public.canon_integrity_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.canon_integrity_assessments(id) ON DELETE CASCADE,
  review_status text NOT NULL DEFAULT 'pending',
  reviewer_ref jsonb DEFAULT NULL,
  review_notes text NOT NULL DEFAULT '',
  recommendation_status text NOT NULL DEFAULT 'monitor',
  linked_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_integrity_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_canon_reviews" ON public.canon_integrity_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_canon_reviews" ON public.canon_integrity_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_canon_reviews" ON public.canon_integrity_reviews FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 5. canon_conformance_signals
CREATE TABLE public.canon_conformance_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_layer text NOT NULL DEFAULT 'documentation',
  signal_type text NOT NULL DEFAULT 'conformance',
  conformance_score numeric NOT NULL DEFAULT 0,
  principle_alignment_score numeric NOT NULL DEFAULT 0,
  mutation_boundary_integrity_score numeric NOT NULL DEFAULT 0,
  signal_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_conformance_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_canon_signals" ON public.canon_conformance_signals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_canon_signals" ON public.canon_conformance_signals FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 6. canon_integrity_outcomes
CREATE TABLE public.canon_integrity_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  review_id uuid REFERENCES public.canon_integrity_reviews(id) ON DELETE CASCADE,
  outcome_type text NOT NULL DEFAULT 'unknown',
  canon_outcome_accuracy_score numeric NOT NULL DEFAULT 0,
  bounded_alignment_readiness_score numeric NOT NULL DEFAULT 0,
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_status text NOT NULL DEFAULT 'pending',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_integrity_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_canon_outcomes" ON public.canon_integrity_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_insert_canon_outcomes" ON public.canon_integrity_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_update_canon_outcomes" ON public.canon_integrity_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_canon_review_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('pending','under_review','reviewed','resolved','dismissed') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  IF NEW.recommendation_status NOT IN ('aligned','monitor','investigate_drift','review_boundary','needs_canon_review','align_docs') THEN
    RAISE EXCEPTION 'Invalid recommendation_status: %', NEW.recommendation_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_canon_review BEFORE INSERT OR UPDATE ON public.canon_integrity_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_canon_review_status();

CREATE OR REPLACE FUNCTION public.validate_canon_outcome_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_canon_outcome BEFORE INSERT OR UPDATE ON public.canon_integrity_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_canon_outcome_status();

CREATE OR REPLACE FUNCTION public.validate_canon_drift_severity()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.severity NOT IN ('low','moderate','high','critical') THEN
    RAISE EXCEPTION 'Invalid severity: %', NEW.severity;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_canon_drift_severity BEFORE INSERT OR UPDATE ON public.canon_drift_events FOR EACH ROW EXECUTE FUNCTION public.validate_canon_drift_severity();
