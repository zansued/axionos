
-- Sprint 93: Cross-Tenant Pattern Synthesis
-- Tables: architecture_synthesized_patterns, architecture_pattern_contributors, architecture_pattern_reviews, architecture_pattern_risk_notes

-- 1. Synthesized Patterns
CREATE TABLE public.architecture_synthesized_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  pattern_name text NOT NULL DEFAULT 'Untitled Pattern',
  synthesis_scope text NOT NULL DEFAULT 'local',
  pattern_class text NOT NULL DEFAULT 'unknown',
  recurring_theme text NOT NULL DEFAULT '',
  confidence_posture text NOT NULL DEFAULT 'low',
  generalization_posture text NOT NULL DEFAULT 'narrow',
  abstraction_level text NOT NULL DEFAULT 'concrete',
  risk_summary text,
  opportunity_summary text,
  sanitized_description text NOT NULL DEFAULT '',
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_synthesized_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage synthesized patterns" ON public.architecture_synthesized_patterns FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_synthesized_pattern()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.pattern_class NOT IN ('recurring_risk','recurring_opportunity','structural_tension','abstraction_candidate','anti_pattern','best_practice') THEN
    RAISE EXCEPTION 'Invalid pattern_class: %', NEW.pattern_class;
  END IF;
  IF NEW.confidence_posture NOT IN ('low','moderate','high','very_high') THEN
    RAISE EXCEPTION 'Invalid confidence_posture: %', NEW.confidence_posture;
  END IF;
  IF NEW.generalization_posture NOT IN ('narrow','context_specific','bounded_general','broad') THEN
    RAISE EXCEPTION 'Invalid generalization_posture: %', NEW.generalization_posture;
  END IF;
  IF NEW.abstraction_level NOT IN ('concrete','low_abstraction','moderate_abstraction','high_abstraction') THEN
    RAISE EXCEPTION 'Invalid abstraction_level: %', NEW.abstraction_level;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_synthesized_pattern BEFORE INSERT OR UPDATE ON public.architecture_synthesized_patterns FOR EACH ROW EXECUTE FUNCTION public.validate_synthesized_pattern();

-- 2. Pattern Contributors
CREATE TABLE public.architecture_pattern_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  pattern_id uuid NOT NULL REFERENCES public.architecture_synthesized_patterns(id),
  contributor_type text NOT NULL DEFAULT 'hypothesis',
  contributor_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  contribution_strength numeric NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_pattern_contributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage pattern contributors" ON public.architecture_pattern_contributors FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_pattern_contributor()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.contributor_type NOT IN ('hypothesis','simulation','campaign','evidence','observation') THEN
    RAISE EXCEPTION 'Invalid contributor_type: %', NEW.contributor_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_pattern_contributor BEFORE INSERT OR UPDATE ON public.architecture_pattern_contributors FOR EACH ROW EXECUTE FUNCTION public.validate_pattern_contributor();

-- 3. Pattern Reviews
CREATE TABLE public.architecture_pattern_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  pattern_id uuid NOT NULL REFERENCES public.architecture_synthesized_patterns(id),
  review_status text NOT NULL DEFAULT 'reviewed',
  review_notes text,
  review_reason_codes jsonb DEFAULT '[]'::jsonb,
  reviewer_ref jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_pattern_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage pattern reviews" ON public.architecture_pattern_reviews FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_pattern_review()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed','accepted','rejected','low_generalization','archived') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_pattern_review BEFORE INSERT OR UPDATE ON public.architecture_pattern_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_pattern_review();

-- 4. Pattern Risk Notes
CREATE TABLE public.architecture_pattern_risk_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  pattern_id uuid NOT NULL REFERENCES public.architecture_synthesized_patterns(id),
  risk_type text NOT NULL DEFAULT 'abstraction_leak',
  risk_severity text NOT NULL DEFAULT 'low',
  risk_description text NOT NULL DEFAULT '',
  mitigation_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_pattern_risk_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage pattern risk notes" ON public.architecture_pattern_risk_notes FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_pattern_risk_note()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.risk_type NOT IN ('abstraction_leak','tenant_exposure','over_generalization','under_generalization','evidence_weakness','structural_conflict') THEN
    RAISE EXCEPTION 'Invalid risk_type: %', NEW.risk_type;
  END IF;
  IF NEW.risk_severity NOT IN ('low','moderate','high','critical') THEN
    RAISE EXCEPTION 'Invalid risk_severity: %', NEW.risk_severity;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_pattern_risk_note BEFORE INSERT OR UPDATE ON public.architecture_pattern_risk_notes FOR EACH ROW EXECUTE FUNCTION public.validate_pattern_risk_note();
