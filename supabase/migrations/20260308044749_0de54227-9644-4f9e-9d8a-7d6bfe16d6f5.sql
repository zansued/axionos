
-- Sprint 51: Institutional Convergence Memory Layer

-- 1. convergence_memory_entries
CREATE TABLE public.convergence_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  memory_type TEXT NOT NULL DEFAULT 'convergence_outcome',
  convergence_domain TEXT NOT NULL DEFAULT 'general',
  source_case_id UUID,
  source_decision_id UUID,
  source_outcome_id UUID,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  context_signature TEXT NOT NULL DEFAULT '',
  specialization_type TEXT NOT NULL DEFAULT 'none',
  action_type TEXT NOT NULL DEFAULT 'unknown',
  rationale TEXT NOT NULL DEFAULT '',
  assumptions JSONB NOT NULL DEFAULT '{}',
  expected_outcomes JSONB NOT NULL DEFAULT '{}',
  realized_outcomes JSONB NOT NULL DEFAULT '{}',
  evidence_density_score NUMERIC NOT NULL DEFAULT 0,
  reuse_confidence_score NUMERIC NOT NULL DEFAULT 0,
  memory_quality_score NUMERIC NOT NULL DEFAULT 0,
  regression_risk_score NUMERIC NOT NULL DEFAULT 0,
  tags JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.convergence_memory_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_conv_mem_entries" ON public.convergence_memory_entries FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_conv_mem_entries" ON public.convergence_memory_entries FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_conv_mem_entries" ON public.convergence_memory_entries FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_conv_mem_entries_org ON public.convergence_memory_entries(organization_id);
CREATE INDEX idx_conv_mem_entries_quality ON public.convergence_memory_entries(memory_quality_score DESC);
CREATE INDEX idx_conv_mem_entries_domain ON public.convergence_memory_entries(convergence_domain);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_convergence_memory_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.memory_type NOT IN ('convergence_outcome','promotion_success','promotion_failure','retention_justified','deprecation_outcome','merge_outcome','anti_pattern','preservation_heuristic') THEN
    RAISE EXCEPTION 'Invalid memory_type: %', NEW.memory_type;
  END IF;
  IF NEW.action_type NOT IN ('unknown','retain_local','bounded_merge','promote_shared','deprecate','retire','none') THEN
    RAISE EXCEPTION 'Invalid action_type: %', NEW.action_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_conv_mem_entry BEFORE INSERT OR UPDATE ON public.convergence_memory_entries FOR EACH ROW EXECUTE FUNCTION public.validate_convergence_memory_entry();

-- 2. convergence_memory_evidence
CREATE TABLE public.convergence_memory_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  memory_entry_id UUID NOT NULL REFERENCES public.convergence_memory_entries(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'outcome_data',
  evidence_payload JSONB NOT NULL DEFAULT '{}',
  source_ref JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.convergence_memory_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_conv_mem_evidence" ON public.convergence_memory_evidence FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_conv_mem_evidence" ON public.convergence_memory_evidence FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_conv_mem_evidence_entry ON public.convergence_memory_evidence(memory_entry_id);

-- 3. convergence_memory_retrievals
CREATE TABLE public.convergence_memory_retrievals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  query_context JSONB NOT NULL DEFAULT '{}',
  matched_entry_ids JSONB NOT NULL DEFAULT '[]',
  relevance_scores JSONB NOT NULL DEFAULT '[]',
  retrieval_purpose TEXT NOT NULL DEFAULT 'advisory',
  requester_ref JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.convergence_memory_retrievals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_conv_mem_retrievals" ON public.convergence_memory_retrievals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_conv_mem_retrievals" ON public.convergence_memory_retrievals FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_conv_mem_retrievals_org ON public.convergence_memory_retrievals(organization_id);

-- 4. convergence_memory_patterns
CREATE TABLE public.convergence_memory_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  pattern_type TEXT NOT NULL DEFAULT 'promotion',
  pattern_key TEXT NOT NULL DEFAULT '',
  pattern_name TEXT NOT NULL DEFAULT '',
  pattern_description TEXT NOT NULL DEFAULT '',
  supporting_entry_ids JSONB NOT NULL DEFAULT '[]',
  pattern_strength NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  last_observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.convergence_memory_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_conv_mem_patterns" ON public.convergence_memory_patterns FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_conv_mem_patterns" ON public.convergence_memory_patterns FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_conv_mem_patterns" ON public.convergence_memory_patterns FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_conv_mem_patterns_org ON public.convergence_memory_patterns(organization_id);
CREATE INDEX idx_conv_mem_patterns_strength ON public.convergence_memory_patterns(pattern_strength DESC);

CREATE OR REPLACE FUNCTION public.validate_convergence_memory_pattern()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.pattern_type NOT IN ('promotion','merge','retention','deprecation','retirement','anti_pattern','preservation') THEN
    RAISE EXCEPTION 'Invalid pattern_type: %', NEW.pattern_type;
  END IF;
  IF NEW.status NOT IN ('active','watch','deprecated') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_conv_mem_pattern BEFORE INSERT OR UPDATE ON public.convergence_memory_patterns FOR EACH ROW EXECUTE FUNCTION public.validate_convergence_memory_pattern();

-- 5. convergence_memory_feedback
CREATE TABLE public.convergence_memory_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  retrieval_id UUID REFERENCES public.convergence_memory_retrievals(id),
  memory_entry_id UUID REFERENCES public.convergence_memory_entries(id),
  usefulness_status TEXT NOT NULL DEFAULT 'pending',
  feedback_notes TEXT NOT NULL DEFAULT '',
  reviewer_ref JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.convergence_memory_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_conv_mem_feedback" ON public.convergence_memory_feedback FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_conv_mem_feedback" ON public.convergence_memory_feedback FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_conv_mem_feedback_org ON public.convergence_memory_feedback(organization_id);

CREATE OR REPLACE FUNCTION public.validate_convergence_memory_feedback()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.usefulness_status NOT IN ('pending','helpful','neutral','harmful','misleading') THEN
    RAISE EXCEPTION 'Invalid usefulness_status: %', NEW.usefulness_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_conv_mem_feedback BEFORE INSERT OR UPDATE ON public.convergence_memory_feedback FOR EACH ROW EXECUTE FUNCTION public.validate_convergence_memory_feedback();
