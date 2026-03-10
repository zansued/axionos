
-- Sprint 112 — Architectural Mutation Control Layer

-- Mutation type enum
CREATE TYPE public.mutation_type AS ENUM (
  'parameter_level',
  'workflow_level',
  'component_level',
  'boundary_level',
  'architecture_level'
);

-- Mutation approval status enum
CREATE TYPE public.mutation_approval_status AS ENUM (
  'pending_analysis',
  'analyzed',
  'under_review',
  'approved',
  'rejected',
  'blocked',
  'archived'
);

-- 1. architectural_mutation_cases
CREATE TABLE public.architectural_mutation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  evolution_proposal_id UUID REFERENCES public.evolution_proposals(id) ON DELETE SET NULL,
  mutation_type public.mutation_type NOT NULL DEFAULT 'parameter_level',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  affected_layers TEXT[] NOT NULL DEFAULT '{}',
  dependency_footprint JSONB NOT NULL DEFAULT '[]'::jsonb,
  coupling_expansion_score NUMERIC NOT NULL DEFAULT 0,
  blast_radius_score NUMERIC NOT NULL DEFAULT 0,
  rollback_viability_score NUMERIC NOT NULL DEFAULT 0,
  topology_change_flag BOOLEAN NOT NULL DEFAULT false,
  forbidden_family_flag BOOLEAN NOT NULL DEFAULT false,
  forbidden_families_detected TEXT[] NOT NULL DEFAULT '{}',
  legitimacy_score NUMERIC NOT NULL DEFAULT 0,
  drift_risk_score NUMERIC NOT NULL DEFAULT 0,
  operator_decision TEXT,
  execution_block_reason TEXT,
  approval_status public.mutation_approval_status NOT NULL DEFAULT 'pending_analysis',
  proposed_by TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mutation_cases_org ON public.architectural_mutation_cases(organization_id);
CREATE INDEX idx_mutation_cases_status ON public.architectural_mutation_cases(approval_status);
CREATE INDEX idx_mutation_cases_proposal ON public.architectural_mutation_cases(evolution_proposal_id);

ALTER TABLE public.architectural_mutation_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view mutation cases"
  ON public.architectural_mutation_cases FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert mutation cases"
  ON public.architectural_mutation_cases FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update mutation cases"
  ON public.architectural_mutation_cases FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 2. architectural_mutation_risk_factors
CREATE TABLE public.architectural_mutation_risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mutation_case_id UUID NOT NULL REFERENCES public.architectural_mutation_cases(id) ON DELETE CASCADE,
  risk_category TEXT NOT NULL DEFAULT '',
  risk_description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'low',
  mitigation_strategy TEXT,
  mitigated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mutation_risks_case ON public.architectural_mutation_risk_factors(mutation_case_id);
ALTER TABLE public.architectural_mutation_risk_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view mutation risks"
  ON public.architectural_mutation_risk_factors FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert mutation risks"
  ON public.architectural_mutation_risk_factors FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 3. architectural_mutation_dependency_maps
CREATE TABLE public.architectural_mutation_dependency_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mutation_case_id UUID NOT NULL REFERENCES public.architectural_mutation_cases(id) ON DELETE CASCADE,
  source_component TEXT NOT NULL DEFAULT '',
  target_component TEXT NOT NULL DEFAULT '',
  dependency_type TEXT NOT NULL DEFAULT 'direct',
  coupling_strength NUMERIC NOT NULL DEFAULT 0,
  is_new_dependency BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mutation_deps_case ON public.architectural_mutation_dependency_maps(mutation_case_id);
ALTER TABLE public.architectural_mutation_dependency_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view mutation deps"
  ON public.architectural_mutation_dependency_maps FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert mutation deps"
  ON public.architectural_mutation_dependency_maps FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 4. architectural_mutation_reversibility_checks
CREATE TABLE public.architectural_mutation_reversibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mutation_case_id UUID NOT NULL REFERENCES public.architectural_mutation_cases(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL DEFAULT '',
  check_description TEXT NOT NULL DEFAULT '',
  passed BOOLEAN NOT NULL DEFAULT false,
  barrier_reason TEXT,
  rollback_cost_estimate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mutation_rev_case ON public.architectural_mutation_reversibility_checks(mutation_case_id);
ALTER TABLE public.architectural_mutation_reversibility_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view mutation rev checks"
  ON public.architectural_mutation_reversibility_checks FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert mutation rev checks"
  ON public.architectural_mutation_reversibility_checks FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 5. architectural_mutation_decisions
CREATE TABLE public.architectural_mutation_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mutation_case_id UUID NOT NULL REFERENCES public.architectural_mutation_cases(id) ON DELETE CASCADE,
  decision TEXT NOT NULL DEFAULT 'pending',
  decision_rationale TEXT,
  decided_by TEXT,
  risk_accepted BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  conditions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mutation_decisions_case ON public.architectural_mutation_decisions(mutation_case_id);
ALTER TABLE public.architectural_mutation_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view mutation decisions"
  ON public.architectural_mutation_decisions FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert mutation decisions"
  ON public.architectural_mutation_decisions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 6. architectural_mutation_lineage
CREATE TABLE public.architectural_mutation_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mutation_case_id UUID NOT NULL REFERENCES public.architectural_mutation_cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT '',
  event_description TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mutation_lineage_case ON public.architectural_mutation_lineage(mutation_case_id);
ALTER TABLE public.architectural_mutation_lineage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view mutation lineage"
  ON public.architectural_mutation_lineage FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert mutation lineage"
  ON public.architectural_mutation_lineage FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));
