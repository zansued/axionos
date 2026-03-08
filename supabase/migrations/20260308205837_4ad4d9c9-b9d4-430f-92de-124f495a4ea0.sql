
-- Sprint 73: Improvement Candidate Distillation Engine
-- Canon-consistent, advisory-first, tenant-isolated

-- Improvement candidates — distilled from evidence
CREATE TABLE public.improvement_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  candidate_type text NOT NULL DEFAULT 'evidence_only_observation',
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  source_pattern text NOT NULL DEFAULT '',
  affected_stages text[] NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'moderate',
  priority_score numeric NOT NULL DEFAULT 0.5,
  confidence_score numeric NOT NULL DEFAULT 0.5,
  recurrence_count integer NOT NULL DEFAULT 1,
  expected_benefit text NOT NULL DEFAULT '',
  risk_posture text NOT NULL DEFAULT 'low',
  review_status text NOT NULL DEFAULT 'new',
  evidence_count integer NOT NULL DEFAULT 0,
  structured_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.improvement_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read improvement candidates"
  ON public.improvement_candidates FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert improvement candidates"
  ON public.improvement_candidates FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update improvement candidates"
  ON public.improvement_candidates FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Link table: candidate ↔ evidence
CREATE TABLE public.improvement_candidate_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.improvement_candidates(id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES public.improvement_evidence(id) ON DELETE CASCADE,
  relevance_score numeric NOT NULL DEFAULT 0.5,
  contribution_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, evidence_id)
);

ALTER TABLE public.improvement_candidate_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read candidate evidence via candidate"
  ON public.improvement_candidate_evidence FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.improvement_candidates c
    WHERE c.id = candidate_id AND public.is_org_member(auth.uid(), c.organization_id)
  ));

CREATE POLICY "Org members can insert candidate evidence via candidate"
  ON public.improvement_candidate_evidence FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.improvement_candidates c
    WHERE c.id = candidate_id AND public.is_org_member(auth.uid(), c.organization_id)
  ));

-- Candidate reviews (audit trail)
CREATE TABLE public.improvement_candidate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.improvement_candidates(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'review',
  previous_status text NOT NULL DEFAULT 'new',
  new_status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.improvement_candidate_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read candidate reviews via candidate"
  ON public.improvement_candidate_reviews FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.improvement_candidates c
    WHERE c.id = candidate_id AND public.is_org_member(auth.uid(), c.organization_id)
  ));

CREATE POLICY "Org members can insert candidate reviews"
  ON public.improvement_candidate_reviews FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.improvement_candidates c
    WHERE c.id = candidate_id AND public.is_org_member(auth.uid(), c.organization_id)
  ));

-- Detected patterns from evidence clustering
CREATE TABLE public.improvement_candidate_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  pattern_key text NOT NULL DEFAULT '',
  pattern_description text NOT NULL DEFAULT '',
  occurrence_count integer NOT NULL DEFAULT 1,
  source_types text[] NOT NULL DEFAULT '{}',
  affected_stages text[] NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'moderate',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  linked_candidate_id uuid REFERENCES public.improvement_candidates(id),
  structured_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.improvement_candidate_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read candidate patterns"
  ON public.improvement_candidate_patterns FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert candidate patterns"
  ON public.improvement_candidate_patterns FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update candidate patterns"
  ON public.improvement_candidate_patterns FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
