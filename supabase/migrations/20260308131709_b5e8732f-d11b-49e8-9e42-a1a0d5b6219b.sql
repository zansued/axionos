
-- Sprint 54: Product Intelligence Operating Layer
-- 6 new tables for operational product intelligence

-- 1. product_operational_benchmarks
CREATE TABLE public.product_operational_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  benchmark_scope_type TEXT NOT NULL DEFAULT 'organization',
  benchmark_scope_id TEXT,
  product_area TEXT,
  benchmark_period TEXT NOT NULL DEFAULT 'weekly',
  adoption_score NUMERIC NOT NULL DEFAULT 0,
  retention_score NUMERIC NOT NULL DEFAULT 0,
  friction_score NUMERIC NOT NULL DEFAULT 0,
  value_score NUMERIC NOT NULL DEFAULT 0,
  product_signal_quality_score NUMERIC NOT NULL DEFAULT 0,
  benchmark_rank INTEGER,
  architecture_alignment_score NUMERIC NOT NULL DEFAULT 0,
  operating_profile_alignment_score NUMERIC NOT NULL DEFAULT 0,
  product_priority_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  signal_noise_penalty_score NUMERIC NOT NULL DEFAULT 0,
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_operational_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_benchmarks" ON public.product_operational_benchmarks FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_benchmarks" ON public.product_operational_benchmarks FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_benchmarks" ON public.product_operational_benchmarks FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. product_signal_quality_reviews
CREATE TABLE public.product_signal_quality_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  signal_id UUID,
  product_area TEXT,
  signal_type TEXT NOT NULL DEFAULT 'unknown',
  quality_score NUMERIC NOT NULL DEFAULT 0,
  consistency_score NUMERIC NOT NULL DEFAULT 0,
  noise_penalty_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  review_period TEXT NOT NULL DEFAULT 'weekly',
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_signal_quality_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_sqr" ON public.product_signal_quality_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_sqr" ON public.product_signal_quality_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 3. product_architecture_correlations
CREATE TABLE public.product_architecture_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  product_area TEXT,
  architecture_mode_id UUID,
  correlation_type TEXT NOT NULL DEFAULT 'outcome',
  adoption_score NUMERIC NOT NULL DEFAULT 0,
  retention_score NUMERIC NOT NULL DEFAULT 0,
  friction_score NUMERIC NOT NULL DEFAULT 0,
  value_score NUMERIC NOT NULL DEFAULT 0,
  architecture_alignment_score NUMERIC NOT NULL DEFAULT 0,
  stability_impact_score NUMERIC NOT NULL DEFAULT 0,
  fitness_impact_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  correlation_strength TEXT NOT NULL DEFAULT 'moderate',
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  limitations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_architecture_correlations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pac" ON public.product_architecture_correlations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pac" ON public.product_architecture_correlations FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. product_profile_correlations
CREATE TABLE public.product_profile_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  product_area TEXT,
  operating_profile_id UUID,
  policy_pack_id UUID,
  correlation_type TEXT NOT NULL DEFAULT 'outcome',
  adoption_score NUMERIC NOT NULL DEFAULT 0,
  retention_score NUMERIC NOT NULL DEFAULT 0,
  friction_score NUMERIC NOT NULL DEFAULT 0,
  value_score NUMERIC NOT NULL DEFAULT 0,
  profile_alignment_score NUMERIC NOT NULL DEFAULT 0,
  override_impact_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  correlation_strength TEXT NOT NULL DEFAULT 'moderate',
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  limitations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_profile_correlations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_ppc" ON public.product_profile_correlations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_ppc" ON public.product_profile_correlations FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 5. product_operational_recommendations
CREATE TABLE public.product_operational_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  product_area TEXT,
  recommendation_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  priority_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  architecture_alignment_score NUMERIC NOT NULL DEFAULT 0,
  profile_alignment_score NUMERIC NOT NULL DEFAULT 0,
  expected_impact_score NUMERIC NOT NULL DEFAULT 0,
  recommendation_status TEXT NOT NULL DEFAULT 'open',
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_operational_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_por" ON public.product_operational_recommendations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_por" ON public.product_operational_recommendations FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_por" ON public.product_operational_recommendations FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 6. product_benchmark_outcomes
CREATE TABLE public.product_benchmark_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  recommendation_id UUID REFERENCES public.product_operational_recommendations(id),
  benchmark_id UUID REFERENCES public.product_operational_benchmarks(id),
  outcome_status TEXT NOT NULL DEFAULT 'pending',
  usefulness_score NUMERIC NOT NULL DEFAULT 0,
  expected_impact NUMERIC NOT NULL DEFAULT 0,
  realized_impact NUMERIC NOT NULL DEFAULT 0,
  false_positive BOOLEAN NOT NULL DEFAULT false,
  drift_detected BOOLEAN NOT NULL DEFAULT false,
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_benchmark_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pbo" ON public.product_benchmark_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pbo" ON public.product_benchmark_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_pbo" ON public.product_benchmark_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_product_benchmark_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_product_benchmark_outcome
  BEFORE INSERT OR UPDATE ON public.product_benchmark_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_benchmark_outcome();

CREATE OR REPLACE FUNCTION public.validate_product_operational_recommendation()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.recommendation_status NOT IN ('open','reviewed','accepted','rejected','dismissed') THEN
    RAISE EXCEPTION 'Invalid recommendation_status: %', NEW.recommendation_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_product_operational_recommendation
  BEFORE INSERT OR UPDATE ON public.product_operational_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_operational_recommendation();

CREATE OR REPLACE FUNCTION public.validate_product_arch_correlation()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.correlation_strength NOT IN ('weak','moderate','strong','very_strong') THEN
    RAISE EXCEPTION 'Invalid correlation_strength: %', NEW.correlation_strength;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_product_arch_correlation
  BEFORE INSERT OR UPDATE ON public.product_architecture_correlations
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_arch_correlation();

CREATE TRIGGER trg_validate_product_profile_correlation
  BEFORE INSERT OR UPDATE ON public.product_profile_correlations
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_arch_correlation();
