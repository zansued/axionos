-- Clean up stuck running jobs for Glass Engine Portfolio initiative
UPDATE initiative_jobs 
SET status = 'failed', 
    error = 'Auto-cleanup: worker killed by runtime timeout before completing',
    completed_at = NOW()
WHERE initiative_id = 'b6c4592d-f624-4802-aa9d-4bc93919c8a4'
  AND status = 'running';

-- Reset stuck in_progress subtasks back to pending so they can be retried
UPDATE story_subtasks 
SET status = 'pending', executed_by_agent_id = NULL
WHERE phase_id IN (
  SELECT sp.id FROM story_phases sp 
  JOIN stories s ON s.id = sp.story_id 
  WHERE s.initiative_id = 'b6c4592d-f624-4802-aa9d-4bc93919c8a4'
)
AND status = 'in_progress';

-- Reset the execution_progress to allow re-trigger
UPDATE initiatives 
SET execution_progress = jsonb_set(
  COALESCE(execution_progress, '{}'::jsonb),
  '{status}', '"idle"'
)
WHERE id = 'b6c4592d-f624-4802-aa9d-4bc93919c8a4';