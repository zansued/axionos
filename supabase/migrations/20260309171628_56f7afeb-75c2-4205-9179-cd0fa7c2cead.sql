-- Fix: make constitution_id nullable in horizon_alignment_evaluations
ALTER TABLE public.horizon_alignment_evaluations ALTER COLUMN constitution_id DROP NOT NULL;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_hce_subject ON public.horizon_conflict_events(subject_id);
CREATE INDEX IF NOT EXISTS idx_mhr_subject ON public.multi_horizon_recommendations(subject_id);
CREATE INDEX IF NOT EXISTS idx_hae_constitution ON public.horizon_alignment_evaluations(constitution_id);
CREATE INDEX IF NOT EXISTS idx_hce_resolved ON public.horizon_conflict_events(resolved_at) WHERE resolved_at IS NULL;