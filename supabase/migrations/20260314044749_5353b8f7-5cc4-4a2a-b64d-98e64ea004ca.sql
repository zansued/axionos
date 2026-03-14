
-- Sprint 207: Agent Learning Feedback Loop

-- Feedback category enum
DO $$ BEGIN
  CREATE TYPE public.learning_feedback_category AS ENUM (
    'successful_application',
    'neutral_application',
    'misapplied_pattern',
    'conflict_detected',
    'insufficient_context',
    'superseded_guidance_detected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Feedback confidence impact direction
DO $$ BEGIN
  CREATE TYPE public.confidence_impact_direction AS ENUM (
    'reinforce',
    'degrade',
    'neutral'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Main feedback table
CREATE TABLE IF NOT EXISTS public.agent_learning_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- What was used
  canon_entry_id uuid,
  skill_id uuid,
  graph_node_id uuid,
  
  -- Execution context
  agent_id text NOT NULL DEFAULT 'unknown',
  agent_type text NOT NULL DEFAULT 'unknown',
  initiative_id uuid,
  story_id uuid,
  subtask_id uuid,
  pipeline_stage text NOT NULL DEFAULT 'unknown',
  execution_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Feedback
  category public.learning_feedback_category NOT NULL,
  impact_direction public.confidence_impact_direction NOT NULL DEFAULT 'neutral',
  raw_confidence_delta numeric NOT NULL DEFAULT 0,
  applied_confidence_delta numeric NOT NULL DEFAULT 0,
  
  -- Scoring details
  outcome_quality_score numeric NOT NULL DEFAULT 0.5,
  relevance_score numeric NOT NULL DEFAULT 0.5,
  context_match_score numeric NOT NULL DEFAULT 0.5,
  
  -- Safeguards
  noise_score numeric NOT NULL DEFAULT 0,
  suppressed boolean NOT NULL DEFAULT false,
  suppression_reason text,
  signal_strength numeric NOT NULL DEFAULT 0.5,
  
  -- Provenance
  feedback_source text NOT NULL DEFAULT 'runtime',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  human_reviewed boolean NOT NULL DEFAULT false,
  human_review_notes text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Aggregated confidence adjustments per canon entry
CREATE TABLE IF NOT EXISTS public.agent_learning_confidence_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  canon_entry_id uuid NOT NULL,
  total_feedback_count integer NOT NULL DEFAULT 0,
  reinforcement_count integer NOT NULL DEFAULT 0,
  degradation_count integer NOT NULL DEFAULT 0,
  neutral_count integer NOT NULL DEFAULT 0,
  cumulative_delta numeric NOT NULL DEFAULT 0,
  last_delta numeric NOT NULL DEFAULT 0,
  current_effective_confidence numeric NOT NULL DEFAULT 0.5,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, canon_entry_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alf_org ON public.agent_learning_feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_alf_canon ON public.agent_learning_feedback(canon_entry_id);
CREATE INDEX IF NOT EXISTS idx_alf_skill ON public.agent_learning_feedback(skill_id);
CREATE INDEX IF NOT EXISTS idx_alf_category ON public.agent_learning_feedback(category);
CREATE INDEX IF NOT EXISTS idx_alf_created ON public.agent_learning_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alf_suppressed ON public.agent_learning_feedback(suppressed) WHERE NOT suppressed;
CREATE INDEX IF NOT EXISTS idx_alcl_org ON public.agent_learning_confidence_ledger(organization_id);
CREATE INDEX IF NOT EXISTS idx_alcl_entry ON public.agent_learning_confidence_ledger(canon_entry_id);

-- RLS
ALTER TABLE public.agent_learning_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_learning_confidence_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "alf_select" ON public.agent_learning_feedback FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "alf_insert" ON public.agent_learning_feedback FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "alf_update" ON public.agent_learning_feedback FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "alcl_select" ON public.agent_learning_confidence_ledger FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "alcl_insert" ON public.agent_learning_confidence_ledger FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "alcl_update" ON public.agent_learning_confidence_ledger FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger: auto-update confidence ledger on feedback insert
CREATE OR REPLACE FUNCTION public.update_confidence_ledger_on_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process non-suppressed feedback with a canon_entry_id
  IF NEW.suppressed OR NEW.canon_entry_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO agent_learning_confidence_ledger (
    organization_id, canon_entry_id,
    total_feedback_count, reinforcement_count, degradation_count, neutral_count,
    cumulative_delta, last_delta, current_effective_confidence, last_updated_at
  )
  VALUES (
    NEW.organization_id, NEW.canon_entry_id,
    1,
    CASE WHEN NEW.impact_direction = 'reinforce' THEN 1 ELSE 0 END,
    CASE WHEN NEW.impact_direction = 'degrade' THEN 1 ELSE 0 END,
    CASE WHEN NEW.impact_direction = 'neutral' THEN 1 ELSE 0 END,
    NEW.applied_confidence_delta,
    NEW.applied_confidence_delta,
    GREATEST(0, LEAST(1, 0.5 + NEW.applied_confidence_delta)),
    now()
  )
  ON CONFLICT (organization_id, canon_entry_id) DO UPDATE SET
    total_feedback_count = agent_learning_confidence_ledger.total_feedback_count + 1,
    reinforcement_count = agent_learning_confidence_ledger.reinforcement_count +
      CASE WHEN NEW.impact_direction = 'reinforce' THEN 1 ELSE 0 END,
    degradation_count = agent_learning_confidence_ledger.degradation_count +
      CASE WHEN NEW.impact_direction = 'degrade' THEN 1 ELSE 0 END,
    neutral_count = agent_learning_confidence_ledger.neutral_count +
      CASE WHEN NEW.impact_direction = 'neutral' THEN 1 ELSE 0 END,
    cumulative_delta = agent_learning_confidence_ledger.cumulative_delta + NEW.applied_confidence_delta,
    last_delta = NEW.applied_confidence_delta,
    current_effective_confidence = GREATEST(0, LEAST(1,
      agent_learning_confidence_ledger.current_effective_confidence + NEW.applied_confidence_delta
    )),
    last_updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_confidence_ledger ON public.agent_learning_feedback;
CREATE TRIGGER trg_update_confidence_ledger
  AFTER INSERT ON public.agent_learning_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_confidence_ledger_on_feedback();

-- Enable realtime for feedback monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_learning_feedback;
