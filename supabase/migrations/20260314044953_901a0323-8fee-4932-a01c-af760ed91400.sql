
-- Sprint 208: Operational Pattern Mining

-- Pattern signal type
DO $$ BEGIN
  CREATE TYPE public.mined_pattern_status AS ENUM (
    'detected',
    'confirmed',
    'candidate_proposed',
    'promoted',
    'dismissed',
    'noise'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.mined_pattern_type AS ENUM (
    'recurring_success',
    'skill_combination',
    'recurring_failure',
    'improvised_method',
    'bottleneck',
    'emergent_convention'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Mined patterns
CREATE TABLE IF NOT EXISTS public.operational_mined_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Pattern identity
  pattern_type public.mined_pattern_type NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  pattern_signature text NOT NULL DEFAULT '',
  
  -- Recurrence
  occurrence_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  
  -- Scoring
  confidence_score numeric NOT NULL DEFAULT 0.3,
  signal_strength numeric NOT NULL DEFAULT 0.3,
  noise_score numeric NOT NULL DEFAULT 0.5,
  success_rate numeric,
  
  -- Context
  agent_types text[] NOT NULL DEFAULT '{}',
  pipeline_stages text[] NOT NULL DEFAULT '{}',
  domain_scopes text[] NOT NULL DEFAULT '{}',
  involved_canon_ids uuid[] NOT NULL DEFAULT '{}',
  involved_skill_ids uuid[] NOT NULL DEFAULT '{}',
  
  -- Status
  status public.mined_pattern_status NOT NULL DEFAULT 'detected',
  proposed_candidate_id uuid,
  dismissal_reason text,
  
  -- Provenance
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Evidence snapshots backing mined patterns
CREATE TABLE IF NOT EXISTS public.operational_mining_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pattern_id uuid NOT NULL REFERENCES public.operational_mined_patterns(id) ON DELETE CASCADE,
  
  -- Source execution
  initiative_id uuid,
  story_id uuid,
  subtask_id uuid,
  agent_type text NOT NULL DEFAULT 'unknown',
  pipeline_stage text NOT NULL DEFAULT 'unknown',
  
  -- Outcome
  outcome_status text NOT NULL DEFAULT 'unknown',
  outcome_quality numeric NOT NULL DEFAULT 0.5,
  
  -- What was used
  canon_entry_ids uuid[] NOT NULL DEFAULT '{}',
  skill_ids uuid[] NOT NULL DEFAULT '{}',
  action_sequence jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Context snapshot
  context_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_omp_org ON public.operational_mined_patterns(organization_id);
CREATE INDEX IF NOT EXISTS idx_omp_status ON public.operational_mined_patterns(status);
CREATE INDEX IF NOT EXISTS idx_omp_type ON public.operational_mined_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_omp_confidence ON public.operational_mined_patterns(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_omp_occurrences ON public.operational_mined_patterns(occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_omp_signature ON public.operational_mined_patterns(organization_id, pattern_signature);
CREATE INDEX IF NOT EXISTS idx_ome_org ON public.operational_mining_evidence(organization_id);
CREATE INDEX IF NOT EXISTS idx_ome_pattern ON public.operational_mining_evidence(pattern_id);

-- RLS
ALTER TABLE public.operational_mined_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_mining_evidence ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "omp_select" ON public.operational_mined_patterns FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "omp_insert" ON public.operational_mined_patterns FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "omp_update" ON public.operational_mined_patterns FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "omp_delete" ON public.operational_mined_patterns FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "ome_select" ON public.operational_mining_evidence FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "ome_insert" ON public.operational_mining_evidence FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
