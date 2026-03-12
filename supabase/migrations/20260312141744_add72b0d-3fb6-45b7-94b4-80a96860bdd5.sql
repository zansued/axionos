
-- Schedule Canon Review Engine to run every 30 minutes
-- Processes pending candidates through AI review and promotes approved ones

SELECT cron.schedule(
  'canon-review-pipeline',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/canon-review-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'action', 'run_full_pipeline',
      'organization_id', org.id
    )
  )
  FROM organizations org
  WHERE org.id IS NOT NULL
  LIMIT 10;
  $$
);
