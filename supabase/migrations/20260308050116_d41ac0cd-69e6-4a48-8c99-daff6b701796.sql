
-- Sprint 53: Product Intelligence Entry

-- 1. product_signal_events
CREATE TABLE public.product_signal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  signal_type TEXT NOT NULL DEFAULT 'adoption',
  signal_source TEXT NOT NULL DEFAULT 'internal',
  signal_scope_type TEXT NOT NULL DEFAULT 'organization',
  signal_scope_id TEXT NOT NULL DEFAULT '',
  product_area TEXT NOT NULL DEFAULT '',
  friction_score NUMERIC NOT NULL DEFAULT 0,
  adoption_score NUMERIC NOT NULL DEFAULT 0,
  retention_signal_score NUMERIC NOT NULL DEFAULT 0,
  value_signal_score NUMERIC NOT NULL DEFAULT 0,
  signal_quality_score NUMERIC NOT NULL DEFAULT 0,
  noise_penalty_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  evidence_links JSONB NOT NULL DEFAULT '[]',
  tags JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_signal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_product_signals" ON public.product_signal_events FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_product_signals" ON public.product_signal_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_product_signals_org ON public.product_signal_events(organization_id);
CREATE INDEX idx_product_signals_type ON public.product_signal_events(signal_type);

CREATE OR REPLACE FUNCTION public.validate_product_signal_event()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.signal_type NOT IN ('adoption','friction','retention','value','opportunity','churn_risk','onboarding','support','usage_pattern') THEN
    RAISE EXCEPTION 'Invalid signal_type: %', NEW.signal_type;
  END IF;
  IF NEW.signal_source NOT IN ('internal','external','user_feedback','telemetry','support_ticket','product_analytics') THEN
    RAISE EXCEPTION 'Invalid signal_source: %', NEW.signal_source;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_product_signal_event BEFORE INSERT OR UPDATE ON public.product_signal_events FOR EACH ROW EXECUTE FUNCTION public.validate_product_signal_event();

-- 2. product_intelligence_profiles
CREATE TABLE public.product_intelligence_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  profile_scope_type TEXT NOT NULL DEFAULT 'organization',
  profile_scope_id TEXT NOT NULL DEFAULT '',
  product_area TEXT NOT NULL DEFAULT '',
  avg_friction_score NUMERIC NOT NULL DEFAULT 0,
  avg_adoption_score NUMERIC NOT NULL DEFAULT 0,
  avg_retention_score NUMERIC NOT NULL DEFAULT 0,
  avg_value_score NUMERIC NOT NULL DEFAULT 0,
  opportunity_density NUMERIC NOT NULL DEFAULT 0,
  signal_quality_posture NUMERIC NOT NULL DEFAULT 0,
  architecture_alignment_score NUMERIC NOT NULL DEFAULT 0,
  operating_profile_alignment_score NUMERIC NOT NULL DEFAULT 0,
  tenant_divergence_signal_score NUMERIC NOT NULL DEFAULT 0,
  linked_architecture_mode_id UUID,
  linked_operating_profile_id UUID,
  signal_count INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_intelligence_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pi_profiles" ON public.product_intelligence_profiles FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pi_profiles" ON public.product_intelligence_profiles FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_pi_profiles" ON public.product_intelligence_profiles FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_pi_profiles_org ON public.product_intelligence_profiles(organization_id);

-- 3. product_opportunity_candidates
CREATE TABLE public.product_opportunity_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  opportunity_type TEXT NOT NULL DEFAULT 'improvement',
  product_area TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  opportunity_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  priority_score NUMERIC NOT NULL DEFAULT 0,
  friction_correlation NUMERIC NOT NULL DEFAULT 0,
  architecture_alignment_score NUMERIC NOT NULL DEFAULT 0,
  profile_alignment_score NUMERIC NOT NULL DEFAULT 0,
  expected_product_impact_score NUMERIC NOT NULL DEFAULT 0,
  feasibility_score NUMERIC NOT NULL DEFAULT 0,
  linked_architecture_mode_id UUID,
  linked_operating_profile_id UUID,
  linked_strategy_variant_id UUID,
  linked_policy_pack_id UUID,
  evidence_links JSONB NOT NULL DEFAULT '[]',
  assumptions JSONB NOT NULL DEFAULT '{}',
  expected_outcomes JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'detected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_opportunity_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_product_opps" ON public.product_opportunity_candidates FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_product_opps" ON public.product_opportunity_candidates FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_product_opps" ON public.product_opportunity_candidates FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_product_opps_org ON public.product_opportunity_candidates(organization_id);

CREATE OR REPLACE FUNCTION public.validate_product_opportunity()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('detected','evaluated','reviewed','approved','rejected','implemented','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.opportunity_type NOT IN ('improvement','expansion','friction_reduction','adoption_boost','retention_fix','value_amplification','new_capability') THEN
    RAISE EXCEPTION 'Invalid opportunity_type: %', NEW.opportunity_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_product_opportunity BEFORE INSERT OR UPDATE ON public.product_opportunity_candidates FOR EACH ROW EXECUTE FUNCTION public.validate_product_opportunity();

-- 4. product_friction_clusters
CREATE TABLE public.product_friction_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  cluster_name TEXT NOT NULL DEFAULT '',
  product_area TEXT NOT NULL DEFAULT '',
  friction_type TEXT NOT NULL DEFAULT 'usability',
  severity_score NUMERIC NOT NULL DEFAULT 0,
  recurrence_count INTEGER NOT NULL DEFAULT 0,
  affected_signal_ids JSONB NOT NULL DEFAULT '[]',
  linked_architecture_mode_id UUID,
  linked_operating_profile_id UUID,
  linked_policy_pack_id UUID,
  architecture_correlation_score NUMERIC NOT NULL DEFAULT 0,
  profile_correlation_score NUMERIC NOT NULL DEFAULT 0,
  trend_direction TEXT NOT NULL DEFAULT 'stable',
  evidence_links JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_friction_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_friction_clusters" ON public.product_friction_clusters FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_friction_clusters" ON public.product_friction_clusters FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_friction_clusters" ON public.product_friction_clusters FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_friction_clusters_org ON public.product_friction_clusters(organization_id);

CREATE OR REPLACE FUNCTION public.validate_friction_cluster()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.friction_type NOT IN ('usability','performance','onboarding','configuration','integration','reliability','cost','security') THEN
    RAISE EXCEPTION 'Invalid friction_type: %', NEW.friction_type;
  END IF;
  IF NEW.status NOT IN ('active','watch','resolved','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.trend_direction NOT IN ('improving','stable','worsening') THEN
    RAISE EXCEPTION 'Invalid trend_direction: %', NEW.trend_direction;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_friction_cluster BEFORE INSERT OR UPDATE ON public.product_friction_clusters FOR EACH ROW EXECUTE FUNCTION public.validate_friction_cluster();

-- 5. product_intelligence_reviews
CREATE TABLE public.product_intelligence_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  opportunity_id UUID REFERENCES public.product_opportunity_candidates(id) ON DELETE CASCADE,
  friction_cluster_id UUID REFERENCES public.product_friction_clusters(id),
  review_type TEXT NOT NULL DEFAULT 'opportunity',
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT NOT NULL DEFAULT '',
  reviewer_ref JSONB NOT NULL DEFAULT '{}',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_intelligence_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pi_reviews" ON public.product_intelligence_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pi_reviews" ON public.product_intelligence_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_pi_reviews_org ON public.product_intelligence_reviews(organization_id);

CREATE OR REPLACE FUNCTION public.validate_pi_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('pending','approved','rejected','deferred') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  IF NEW.review_type NOT IN ('opportunity','friction','segmentation','prioritization') THEN
    RAISE EXCEPTION 'Invalid review_type: %', NEW.review_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_pi_review BEFORE INSERT OR UPDATE ON public.product_intelligence_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_pi_review();

-- 6. product_intelligence_outcomes
CREATE TABLE public.product_intelligence_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  opportunity_id UUID REFERENCES public.product_opportunity_candidates(id) ON DELETE CASCADE,
  outcome_status TEXT NOT NULL DEFAULT 'pending',
  expected_product_impact NUMERIC NOT NULL DEFAULT 0,
  realized_product_impact NUMERIC NOT NULL DEFAULT 0,
  expected_friction_reduction NUMERIC NOT NULL DEFAULT 0,
  realized_friction_reduction NUMERIC NOT NULL DEFAULT 0,
  expected_adoption_gain NUMERIC NOT NULL DEFAULT 0,
  realized_adoption_gain NUMERIC NOT NULL DEFAULT 0,
  expected_retention_gain NUMERIC NOT NULL DEFAULT 0,
  realized_retention_gain NUMERIC NOT NULL DEFAULT 0,
  product_effectiveness_score NUMERIC NOT NULL DEFAULT 0,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_intelligence_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pi_outcomes" ON public.product_intelligence_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pi_outcomes" ON public.product_intelligence_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_pi_outcomes_org ON public.product_intelligence_outcomes(organization_id);

CREATE OR REPLACE FUNCTION public.validate_pi_outcome()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_pi_outcome BEFORE INSERT OR UPDATE ON public.product_intelligence_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_pi_outcome();
