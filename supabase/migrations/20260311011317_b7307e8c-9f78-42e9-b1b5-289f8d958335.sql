
-- Sprint 142: Canon Learning Feedback & Evolution Loop tables

-- 1. Canon Learning Candidates — operational learning converted to candidate canon
CREATE TABLE public.canon_learning_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  candidate_source text NOT NULL DEFAULT 'runtime_learning',
  source_type text NOT NULL DEFAULT 'repair_loop',
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_practice_type text NOT NULL DEFAULT 'best_practice',
  proposed_domain text NOT NULL DEFAULT '',
  proposed_stack_scope text NOT NULL DEFAULT '',
  signal_count integer NOT NULL DEFAULT 1,
  confidence_score numeric NOT NULL DEFAULT 0,
  noise_suppressed boolean NOT NULL DEFAULT false,
  suppression_reason text,
  review_status text NOT NULL DEFAULT 'pending',
  reviewed_by text,
  review_notes text,
  promoted_to_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_learning_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage canon_learning_candidates" ON public.canon_learning_candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Canon Learning Signals — raw operational signals before clustering
CREATE TABLE public.canon_learning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  signal_type text NOT NULL DEFAULT 'repair_outcome',
  signal_source text NOT NULL DEFAULT 'system',
  initiative_id uuid,
  stage_name text NOT NULL DEFAULT '',
  error_signature text,
  strategy_used text,
  outcome text NOT NULL DEFAULT '',
  outcome_success boolean NOT NULL DEFAULT false,
  confidence numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  clustered boolean NOT NULL DEFAULT false,
  cluster_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_learning_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage canon_learning_signals" ON public.canon_learning_signals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Canon Failure Patterns — recurring failure patterns detected from signals
CREATE TABLE public.canon_failure_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  pattern_signature text NOT NULL DEFAULT '',
  pattern_description text NOT NULL DEFAULT '',
  occurrence_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  affected_stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'active',
  learning_candidate_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_failure_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage canon_failure_patterns" ON public.canon_failure_patterns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Canon Refactor Patterns — successful refactors identified as reusable patterns
CREATE TABLE public.canon_refactor_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  pattern_name text NOT NULL DEFAULT '',
  pattern_description text NOT NULL DEFAULT '',
  refactor_type text NOT NULL DEFAULT 'code_improvement',
  success_rate numeric NOT NULL DEFAULT 0,
  occurrence_count integer NOT NULL DEFAULT 1,
  affected_domains jsonb NOT NULL DEFAULT '[]'::jsonb,
  representative_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  learning_candidate_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_refactor_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage canon_refactor_patterns" ON public.canon_refactor_patterns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Canon Validation Patterns — recurring validation findings
CREATE TABLE public.canon_validation_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  pattern_name text NOT NULL DEFAULT '',
  validation_type text NOT NULL DEFAULT 'quality_gate',
  pattern_description text NOT NULL DEFAULT '',
  failure_rate numeric NOT NULL DEFAULT 0,
  occurrence_count integer NOT NULL DEFAULT 1,
  affected_stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_action text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  learning_candidate_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_validation_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage canon_validation_patterns" ON public.canon_validation_patterns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Canon Success Patterns — recurring successes worth codifying
CREATE TABLE public.canon_success_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  pattern_name text NOT NULL DEFAULT '',
  pattern_description text NOT NULL DEFAULT '',
  success_type text NOT NULL DEFAULT 'execution_efficiency',
  success_rate numeric NOT NULL DEFAULT 0,
  occurrence_count integer NOT NULL DEFAULT 1,
  contributing_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  applicable_domains jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  learning_candidate_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_success_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage canon_success_patterns" ON public.canon_success_patterns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Canon Candidate Reviews — steward reviews on learning candidates
CREATE TABLE public.canon_candidate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  candidate_id uuid NOT NULL,
  reviewer text NOT NULL DEFAULT 'system',
  verdict text NOT NULL DEFAULT 'pending',
  confidence_assessment numeric NOT NULL DEFAULT 0,
  review_notes text NOT NULL DEFAULT '',
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_candidate_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage canon_candidate_reviews" ON public.canon_candidate_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Canon Candidate Lineage — tracks origin chain for learning candidates
CREATE TABLE public.canon_candidate_lineage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  candidate_id uuid NOT NULL,
  lineage_type text NOT NULL DEFAULT 'signal_cluster',
  source_ref text NOT NULL DEFAULT '',
  source_table text NOT NULL DEFAULT '',
  contribution_weight numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_candidate_lineage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage canon_candidate_lineage" ON public.canon_candidate_lineage FOR ALL TO authenticated USING (true) WITH CHECK (true);
