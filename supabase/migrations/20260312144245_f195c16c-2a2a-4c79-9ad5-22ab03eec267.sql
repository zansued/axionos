
-- Fix learning_candidates table: add all missing columns that neural-feedback-loop
-- and deep-repo-absorber-engine try to insert
ALTER TABLE public.learning_candidates
  ADD COLUMN IF NOT EXISTS title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary text DEFAULT '',
  ADD COLUMN IF NOT EXISTS initiative_id uuid REFERENCES public.initiatives(id),
  ADD COLUMN IF NOT EXISTS proposed_practice_type text DEFAULT 'pattern',
  ADD COLUMN IF NOT EXISTS signal_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'operational',
  ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evaluation_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evaluation_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS evaluation_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by text DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS promoted_entry_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create indexes for the review engine
CREATE INDEX IF NOT EXISTS idx_lc_review_status ON public.learning_candidates(review_status);
CREATE INDEX IF NOT EXISTS idx_lc_evaluation_status ON public.learning_candidates(evaluation_status);
CREATE INDEX IF NOT EXISTS idx_lc_org_status ON public.learning_candidates(organization_id, status);

-- Create operational_learning_signals table (referenced by neural-feedback-loop and deep-repo-absorber)
CREATE TABLE IF NOT EXISTS public.operational_learning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  initiative_id uuid REFERENCES public.initiatives(id),
  signal_type text NOT NULL DEFAULT 'operational',
  outcome text DEFAULT '',
  outcome_success boolean DEFAULT false,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_learning_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view operational signals for their org"
  ON public.operational_learning_signals FOR SELECT
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Service can insert operational signals"
  ON public.operational_learning_signals FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ols_org ON public.operational_learning_signals(organization_id);
CREATE INDEX IF NOT EXISTS idx_ols_signal_type ON public.operational_learning_signals(signal_type);
