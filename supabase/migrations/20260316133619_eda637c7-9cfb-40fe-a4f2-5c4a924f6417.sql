
-- Sprint 204: Consolidated timeline view
-- Joins initiative_jobs + agent_outputs + action_audit_events into a unified timeline

CREATE OR REPLACE VIEW public.initiative_timeline_v AS

-- Initiative Jobs
SELECT 
  j.initiative_id,
  j.id AS event_id,
  'job' AS event_type,
  j.stage AS event_stage,
  j.status AS event_status,
  j.created_at AS event_at,
  j.completed_at,
  j.duration_ms,
  jsonb_build_object(
    'job_id', j.id,
    'stage', j.stage,
    'status', j.status,
    'model', j.model,
    'cost_usd', j.cost_usd,
    'error', j.error,
    'trace_id', j.inputs->>'trace_id',
    'wave_number', j.inputs->>'wave_number'
  ) AS event_data
FROM initiative_jobs j
WHERE j.initiative_id IS NOT NULL

UNION ALL

-- Agent Outputs
SELECT
  ao.initiative_id,
  ao.id AS event_id,
  'agent_output' AS event_type,
  ao.type::text AS event_stage,
  ao.status::text AS event_status,
  ao.created_at AS event_at,
  ao.updated_at AS completed_at,
  NULL::integer AS duration_ms,
  jsonb_build_object(
    'output_id', ao.id,
    'type', ao.type,
    'status', ao.status,
    'model', ao.model_used,
    'tokens', ao.tokens_used,
    'cost', ao.cost_estimate,
    'summary', left(ao.summary, 200)
  ) AS event_data
FROM agent_outputs ao
WHERE ao.initiative_id IS NOT NULL

UNION ALL

-- Action Audit Events (linked via action_registry_entries)
SELECT
  are.initiative_id,
  aae.id AS event_id,
  'action_event' AS event_type,
  are.stage AS event_stage,
  aae.event_type AS event_status,
  aae.created_at AS event_at,
  NULL::timestamptz AS completed_at,
  NULL::integer AS duration_ms,
  jsonb_build_object(
    'action_id', aae.action_id,
    'event_type', aae.event_type,
    'actor_type', aae.actor_type,
    'previous_status', aae.previous_status,
    'new_status', aae.new_status,
    'reason', aae.reason
  ) AS event_data
FROM action_audit_events aae
JOIN action_registry_entries are ON are.action_id = aae.action_id
WHERE are.initiative_id IS NOT NULL

ORDER BY event_at DESC;
