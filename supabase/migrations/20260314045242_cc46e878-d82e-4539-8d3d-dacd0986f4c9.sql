
-- Sprint 209: Extend canon_evolution_proposals with self-improving fields

-- Add new columns to existing table
ALTER TABLE public.canon_evolution_proposals
  ADD COLUMN IF NOT EXISTS secondary_entry_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evidence_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS evidence_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS feedback_signal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mined_pattern_refs uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS impact_level text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS confidence_score numeric NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS urgency_score numeric NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS priority_score numeric NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS risk_score_v2 numeric NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS requires_human_review boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_approvable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS block_reason text,
  ADD COLUMN IF NOT EXISTS proposal_source text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS executed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS executed_at timestamptz,
  ADD COLUMN IF NOT EXISTS execution_result jsonb;

-- Rate limiting table
CREATE TABLE IF NOT EXISTS public.canon_evolution_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT date_trunc('day', now()),
  proposal_count integer NOT NULL DEFAULT 0,
  max_proposals_per_window integer NOT NULL DEFAULT 20,
  UNIQUE (organization_id, window_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cep_priority ON public.canon_evolution_proposals(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_cep_impact ON public.canon_evolution_proposals(impact_level);
CREATE INDEX IF NOT EXISTS idx_cerl_org ON public.canon_evolution_rate_limits(organization_id, window_start);

-- RLS for rate limits
ALTER TABLE public.canon_evolution_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "cerl_select" ON public.canon_evolution_rate_limits FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "cerl_insert" ON public.canon_evolution_rate_limits FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "cerl_update" ON public.canon_evolution_rate_limits FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
