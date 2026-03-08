
-- Sprint 44: Architecture Fitness Functions

-- 1. Architecture Fitness Dimensions
CREATE TABLE public.architecture_fitness_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  dimension_key text NOT NULL,
  dimension_name text NOT NULL,
  dimension_scope text NOT NULL DEFAULT 'global',
  dimension_definition jsonb NOT NULL DEFAULT '{}',
  scoring_policy jsonb NOT NULL DEFAULT '{}',
  warning_threshold jsonb NOT NULL DEFAULT '{}',
  critical_threshold jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, dimension_key)
);

ALTER TABLE public.architecture_fitness_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_arch_fitness_dims" ON public.architecture_fitness_dimensions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_arch_fitness_dims" ON public.architecture_fitness_dimensions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_arch_fitness_dims" ON public.architecture_fitness_dimensions FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_architecture_fitness_dimension() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.dimension_scope NOT IN ('global','organization','workspace','context_class','subsystem') THEN RAISE EXCEPTION 'Invalid dimension_scope: %', NEW.dimension_scope; END IF;
  IF NEW.status NOT IN ('active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_arch_fitness_dim BEFORE INSERT OR UPDATE ON public.architecture_fitness_dimensions FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_fitness_dimension();

-- 2. Architecture Fitness Evaluations
CREATE TABLE public.architecture_fitness_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  dimension_id uuid NOT NULL REFERENCES public.architecture_fitness_dimensions(id),
  scope_ref jsonb,
  score numeric NOT NULL DEFAULT 0,
  degradation_status text NOT NULL DEFAULT 'healthy',
  confidence_score numeric,
  rationale_codes jsonb,
  evidence_refs jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_fitness_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_arch_fitness_evals" ON public.architecture_fitness_evaluations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_arch_fitness_evals" ON public.architecture_fitness_evaluations FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_architecture_fitness_evaluation() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.degradation_status NOT IN ('healthy','watch','degrading','critical') THEN RAISE EXCEPTION 'Invalid degradation_status: %', NEW.degradation_status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_arch_fitness_eval BEFORE INSERT OR UPDATE ON public.architecture_fitness_evaluations FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_fitness_evaluation();

-- 3. Architecture Fitness Recommendations
CREATE TABLE public.architecture_fitness_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  dimension_id uuid NOT NULL REFERENCES public.architecture_fitness_dimensions(id),
  target_scope text NOT NULL DEFAULT '',
  target_entities jsonb NOT NULL DEFAULT '[]',
  recommendation_type text NOT NULL DEFAULT '',
  recommendation_reason jsonb NOT NULL DEFAULT '{}',
  confidence_score numeric,
  priority_score numeric,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_fitness_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_arch_fitness_recs" ON public.architecture_fitness_recommendations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_arch_fitness_recs" ON public.architecture_fitness_recommendations FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_arch_fitness_recs" ON public.architecture_fitness_recommendations FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_architecture_fitness_recommendation() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','reviewed','accepted','rejected','dismissed') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_arch_fitness_rec BEFORE INSERT OR UPDATE ON public.architecture_fitness_recommendations FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_fitness_recommendation();

-- 4. Architecture Fitness Reviews
CREATE TABLE public.architecture_fitness_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  evaluation_ref jsonb,
  recommendation_id uuid REFERENCES public.architecture_fitness_recommendations(id),
  reviewer_ref jsonb,
  review_status text NOT NULL DEFAULT 'reviewed',
  review_notes text,
  review_reason_codes jsonb,
  linked_changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_fitness_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_arch_fitness_reviews" ON public.architecture_fitness_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_arch_fitness_reviews" ON public.architecture_fitness_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_arch_fitness_reviews" ON public.architecture_fitness_reviews FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_architecture_fitness_review() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed','accepted','rejected','dismissed','archived') THEN RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_arch_fitness_review BEFORE INSERT OR UPDATE ON public.architecture_fitness_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_architecture_fitness_review();
