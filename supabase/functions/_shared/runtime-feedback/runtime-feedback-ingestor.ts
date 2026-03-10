/**
 * Runtime Feedback Ingestor — Sprint 119
 * Validates and normalizes incoming runtime feedback events.
 */

export interface RuntimeEventInput {
  organization_id: string;
  event_type: string;
  event_source: string;
  severity?: string;
  affected_surface?: string;
  observed_behavior?: string;
  outcome_classification?: string;
  confidence_score?: number;
  project_id?: string;
  artifact_id?: string;
  execution_id?: string;
  deploy_id?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestResult {
  valid: boolean;
  errors: string[];
  event: Record<string, unknown> | null;
}

const VALID_EVENT_TYPES = ["error", "warning", "degradation", "recovery", "rollback", "observation", "health_check", "incident"];
const VALID_SEVERITIES = ["info", "low", "medium", "high", "critical"];

export function ingestRuntimeEvent(input: RuntimeEventInput): IngestResult {
  const errors: string[] = [];
  if (!input.organization_id) errors.push("organization_id is required");
  if (!input.event_type) errors.push("event_type is required");
  if (!VALID_EVENT_TYPES.includes(input.event_type)) errors.push(`event_type must be one of: ${VALID_EVENT_TYPES.join(", ")}`);
  if (input.severity && !VALID_SEVERITIES.includes(input.severity)) errors.push(`severity must be one of: ${VALID_SEVERITIES.join(", ")}`);

  if (errors.length > 0) return { valid: false, errors, event: null };

  return {
    valid: true,
    errors: [],
    event: {
      organization_id: input.organization_id,
      project_id: input.project_id || null,
      artifact_id: input.artifact_id || null,
      execution_id: input.execution_id || null,
      deploy_id: input.deploy_id || null,
      event_type: input.event_type,
      event_source: input.event_source || "system",
      severity: input.severity || "info",
      affected_surface: input.affected_surface || "",
      observed_behavior: input.observed_behavior || "",
      outcome_classification: input.outcome_classification || "neutral",
      confidence_score: Math.max(0, Math.min(100, input.confidence_score || 0)),
      metadata: input.metadata || {},
      occurred_at: new Date().toISOString(),
    },
  };
}
