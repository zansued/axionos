-- Cleanup stuck running workers for initiative a3ade41d-2fcc-4d55-850f-8fcc05350300
UPDATE initiative_jobs 
SET status = 'failed', 
    error = 'Auto-cleanup: stuck worker after pipeline restart', 
    completed_at = now() 
WHERE initiative_id = 'a3ade41d-2fcc-4d55-850f-8fcc05350300' 
  AND status = 'running' 
  AND created_at >= '2026-03-19 02:20:00';

-- Update execution_progress to reflect actual state
UPDATE initiatives 
SET execution_progress = jsonb_set(
  execution_progress,
  '{executed}',
  '11'
)
WHERE id = 'a3ade41d-2fcc-4d55-850f-8fcc05350300';
