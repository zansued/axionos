
-- Sprint 49: Platform Convergence Layer

-- 1. platform_convergence_profiles
CREATE TABLE public.platform_convergence_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  scope_type TEXT NOT NULL DEFAULT 'organization',
  scope_id TEXT NOT NULL DEFAULT '',
  convergence_domain TEXT NOT NULL DEFAULT 'architecture_mode',
  current_divergence_score NUMERIC NOT NULL DEFAULT 0,
  beneficial_specialization_score NUMERIC NOT NULL DEFAULT 0,
  fragmentation_risk_score NUMERIC NOT NULL DEFAULT 0,
  specialization_debt_score NUMERIC NOT NULL DEFAULT 0,
  economic_redundancy_score NUMERIC NOT NULL DEFAULT 0,
  rollback_complexity_score NUMERIC NOT NULL DEFAULT 0,
  convergence_priority_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  evidence_links JSONB NOT NULL DEFAULT '{}',
  assumptions JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. divergence_signals
CREATE TABLE public.divergence_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  scope_type TEXT NOT NULL DEFAULT 'organization',
  scope_id TEXT NOT NULL DEFAULT '',
  signal_type TEXT NOT NULL DEFAULT 'divergence',
  convergence_domain TEXT NOT NULL DEFAULT 'architecture_mode',
  severity TEXT NOT NULL DEFAULT 'low',
  divergence_score NUMERIC NOT NULL DEFAULT 0,
  fragmentation_risk_score NUMERIC NOT NULL DEFAULT 0,
  specialization_debt_score NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  source_refs JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. convergence_candidates
CREATE TABLE public.convergence_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  convergence_domain TEXT NOT NULL DEFAULT 'architecture_mode',
  candidate_type TEXT NOT NULL DEFAULT 'merge',
  scope_type TEXT NOT NULL DEFAULT 'organization',
  target_entities JSONB NOT NULL DEFAULT '[]',
  merge_safety_score NUMERIC NOT NULL DEFAULT 0.5,
  retention_justification_score NUMERIC NOT NULL DEFAULT 0,
  deprecation_candidate_score NUMERIC NOT NULL DEFAULT 0,
  convergence_expected_value NUMERIC NOT NULL DEFAULT 0,
  convergence_priority_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  evidence_links JSONB NOT NULL DEFAULT '{}',
  assumptions JSONB NOT NULL DEFAULT '{}',
  rationale_codes JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. convergence_recommendations
CREATE TABLE public.convergence_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  candidate_id UUID REFERENCES public.convergence_candidates(id),
  recommendation_type TEXT NOT NULL DEFAULT 'merge',
  convergence_domain TEXT NOT NULL DEFAULT 'architecture_mode',
  target_scope TEXT NOT NULL DEFAULT 'organization',
  target_entities JSONB NOT NULL DEFAULT '[]',
  recommendation_reason JSONB NOT NULL DEFAULT '{}',
  expected_impact JSONB NOT NULL DEFAULT '{}',
  priority_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  safety_class TEXT NOT NULL DEFAULT 'advisory_only',
  review_requirements JSONB NOT NULL DEFAULT '{}',
  evidence_links JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. convergence_outcomes
CREATE TABLE public.convergence_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  recommendation_id UUID REFERENCES public.convergence_recommendations(id),
  convergence_domain TEXT NOT NULL DEFAULT 'architecture_mode',
  action_taken TEXT NOT NULL DEFAULT 'none',
  projected_impact JSONB NOT NULL DEFAULT '{}',
  realized_impact JSONB NOT NULL DEFAULT '{}',
  outcome_status TEXT NOT NULL DEFAULT 'pending',
  delta_summary JSONB NOT NULL DEFAULT '{}',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.platform_convergence_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divergence_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convergence_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convergence_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convergence_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage convergence profiles" ON public.platform_convergence_profiles FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage divergence signals" ON public.divergence_signals FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage convergence candidates" ON public.convergence_candidates FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage convergence recommendations" ON public.convergence_recommendations FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage convergence outcomes" ON public.convergence_outcomes FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Indexes
CREATE INDEX idx_convergence_profiles_org ON public.platform_convergence_profiles(organization_id);
CREATE INDEX idx_divergence_signals_org ON public.divergence_signals(organization_id);
CREATE INDEX idx_convergence_candidates_org_status ON public.convergence_candidates(organization_id, status);
CREATE INDEX idx_convergence_recommendations_org_status ON public.convergence_recommendations(organization_id, status);
CREATE INDEX idx_convergence_outcomes_org ON public.convergence_outcomes(organization_id);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_convergence_recommendation()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','reviewed','accepted','rejected','dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.safety_class NOT IN ('advisory_only','high_review_required') THEN
    RAISE EXCEPTION 'Invalid safety_class: %', NEW.safety_class;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_convergence_recommendation
  BEFORE INSERT OR UPDATE ON public.convergence_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.validate_convergence_recommendation();

CREATE OR REPLACE FUNCTION public.validate_convergence_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_convergence_outcome
  BEFORE INSERT OR UPDATE ON public.convergence_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_convergence_outcome();

CREATE OR REPLACE FUNCTION public.validate_divergence_signal()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.severity NOT IN ('low','moderate','high','critical') THEN
    RAISE EXCEPTION 'Invalid severity: %', NEW.severity;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_divergence_signal
  BEFORE INSERT OR UPDATE ON public.divergence_signals
  FOR EACH ROW EXECUTE FUNCTION public.validate_divergence_signal();
