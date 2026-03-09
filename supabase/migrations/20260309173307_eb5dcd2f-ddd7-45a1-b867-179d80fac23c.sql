-- Sprint 109 fix: add missing indexes and posture column
CREATE INDEX IF NOT EXISTS idx_mission_alignment_evaluations_subject ON public.mission_alignment_evaluations(subject_id);
CREATE INDEX IF NOT EXISTS idx_mission_alignment_evaluations_constitution ON public.mission_alignment_evaluations(constitution_id);
CREATE INDEX IF NOT EXISTS idx_mission_drift_events_subject ON public.mission_drift_events(subject_id);
CREATE INDEX IF NOT EXISTS idx_mission_correction_recommendations_subject ON public.mission_correction_recommendations(subject_id);
CREATE INDEX IF NOT EXISTS idx_mission_integrity_snapshots_constitution ON public.mission_integrity_snapshots(constitution_id);

-- Add posture column to evaluations
ALTER TABLE public.mission_alignment_evaluations ADD COLUMN IF NOT EXISTS posture text NOT NULL DEFAULT 'mission_aligned';

-- Allow constitution_id to be nullable (evaluation may run without active constitution)
ALTER TABLE public.mission_alignment_evaluations ALTER COLUMN constitution_id DROP NOT NULL;