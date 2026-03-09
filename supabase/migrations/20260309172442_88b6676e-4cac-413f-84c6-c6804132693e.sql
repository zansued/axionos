-- Sprint 108 fix: add missing subject_id indexes for JOIN performance
CREATE INDEX IF NOT EXISTS idx_tradeoff_arbitration_events_subject ON public.tradeoff_arbitration_events(subject_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_recommendations_subject ON public.tradeoff_recommendations(subject_id);