
-- Sprint 91: Architecture Hypothesis Engine

-- 1. architecture_hypotheses
CREATE TABLE public.architecture_hypotheses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  hypothesis_type text NOT NULL DEFAULT 'structural',
  target_area text NOT NULL DEFAULT 'unknown',
  problem_statement text NOT NULL DEFAULT '',
  proposed_idea text NOT NULL DEFAULT '',
  expected_benefit text NOT NULL DEFAULT '',
  risk_posture text NOT NULL DEFAULT 'low',
  uncertainty_posture text NOT NULL DEFAULT 'moderate',
  confidence_score numeric NOT NULL DEFAULT 0.5,
  validation_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  originating_evidence_summary text NOT NULL DEFAULT '',
  review_status text NOT NULL DEFAULT 'candidate',
  simulation_ready boolean NOT NULL DEFAULT false,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_hypotheses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read architecture_hypotheses" ON public.architecture_hypotheses FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_hypotheses" ON public.architecture_hypotheses FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update architecture_hypotheses" ON public.architecture_hypotheses FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_architecture_hypothesis() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.hypothesis_type NOT IN ('structural','runtime','governance','coordination','ecosystem','delivery','reliability','scaling') THEN RAISE EXCEPTION 'Invalid hypothesis_type: %', NEW.hypothesis_type; END IF;
  IF NEW.risk_posture NOT IN ('low','moderate','high','critical') THEN RAISE EXCEPTION 'Invalid risk_posture: %', NEW.risk_posture; END IF;
  IF NEW.uncertainty_posture NOT IN ('low','moderate','high','very_high') THEN RAISE EXCEPTION 'Invalid uncertainty_posture: %', NEW.uncertainty_posture; END IF;
  IF NEW.review_status NOT IN ('candidate','under_review','accepted','rejected','archived','simulation_ready') THEN RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_architecture_hypothesis BEFORE INSERT OR UPDATE ON public.architecture_hypotheses FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_hypothesis();

-- 2. architecture_hypothesis_evidence
CREATE TABLE public.architecture_hypothesis_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  hypothesis_id uuid NOT NULL REFERENCES public.architecture_hypotheses(id),
  evidence_type text NOT NULL DEFAULT 'operational_friction',
  evidence_source text NOT NULL DEFAULT 'unknown',
  evidence_summary text NOT NULL DEFAULT '',
  evidence_strength text NOT NULL DEFAULT 'moderate',
  evidence_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_hypothesis_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read architecture_hypothesis_evidence" ON public.architecture_hypothesis_evidence FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_hypothesis_evidence" ON public.architecture_hypothesis_evidence FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_hypothesis_evidence() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.evidence_type NOT IN ('operational_friction','delivery_outcome','post_deploy_feedback','reliability_pattern','coordination_bottleneck','ecosystem_signal','runtime_scale','repeated_pattern') THEN RAISE EXCEPTION 'Invalid evidence_type: %', NEW.evidence_type; END IF;
  IF NEW.evidence_strength NOT IN ('weak','moderate','strong','very_strong') THEN RAISE EXCEPTION 'Invalid evidence_strength: %', NEW.evidence_strength; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_hypothesis_evidence BEFORE INSERT OR UPDATE ON public.architecture_hypothesis_evidence FOR EACH ROW EXECUTE FUNCTION public.validate_hypothesis_evidence();

-- 3. architecture_hypothesis_reviews
CREATE TABLE public.architecture_hypothesis_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  hypothesis_id uuid NOT NULL REFERENCES public.architecture_hypotheses(id),
  review_status text NOT NULL DEFAULT 'reviewed',
  review_notes text NOT NULL DEFAULT '',
  reviewer_ref jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_hypothesis_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read architecture_hypothesis_reviews" ON public.architecture_hypothesis_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_hypothesis_reviews" ON public.architecture_hypothesis_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_hypothesis_review() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed','accepted','rejected','deferred','archived') THEN RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_hypothesis_review BEFORE INSERT OR UPDATE ON public.architecture_hypothesis_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_hypothesis_review();

-- 4. architecture_hypothesis_tags
CREATE TABLE public.architecture_hypothesis_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  hypothesis_id uuid NOT NULL REFERENCES public.architecture_hypotheses(id),
  tag_key text NOT NULL DEFAULT '',
  tag_value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_hypothesis_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read architecture_hypothesis_tags" ON public.architecture_hypothesis_tags FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert architecture_hypothesis_tags" ON public.architecture_hypothesis_tags FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
