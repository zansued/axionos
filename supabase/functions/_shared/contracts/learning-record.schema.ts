// Learning Record Contract Schema — AxionOS Sprint 10
// Canonical structure for learning memory units.

export type LearningType =
  | "prompt_outcome"
  | "repair_outcome"
  | "prevention_outcome"
  | "routing_outcome"
  | "generation_outcome";

export type LearningSourceType =
  | "initiative"
  | "repair_evidence"
  | "error_pattern"
  | "prevention_rule"
  | "routing_decision"
  | "stage_execution";

export interface LearningRecord {
  learning_record_id: string;
  initiative_id: string | null;
  organization_id: string;
  stage_name: string;
  learning_type: LearningType;
  source_type: LearningSourceType;
  source_id: string | null;
  input_signature: string | null;
  decision_taken: string;
  outcome_summary: string;
  success_signal: number; // 0-100
  failure_signal: number; // 0-100
  cost_signal: number | null;
  time_signal: number | null;
  recommended_adjustment: string | null;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

const LEARNING_TYPES: LearningType[] = [
  "prompt_outcome", "repair_outcome", "prevention_outcome",
  "routing_outcome", "generation_outcome",
];

const SOURCE_TYPES: LearningSourceType[] = [
  "initiative", "repair_evidence", "error_pattern",
  "prevention_rule", "routing_decision", "stage_execution",
];

export function validateLearningRecord(
  data: unknown,
): { success: true; data: LearningRecord } | { success: false; error: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Learning record must be an object" };
  }
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.learning_record_id || typeof d.learning_record_id !== "string") errors.push("learning_record_id required");
  if (!d.organization_id || typeof d.organization_id !== "string") errors.push("organization_id required");
  if (!d.stage_name || typeof d.stage_name !== "string") errors.push("stage_name required");
  if (!LEARNING_TYPES.includes(d.learning_type as LearningType)) {
    errors.push(`learning_type must be one of: ${LEARNING_TYPES.join(", ")}`);
  }
  if (!SOURCE_TYPES.includes(d.source_type as LearningSourceType)) {
    errors.push(`source_type must be one of: ${SOURCE_TYPES.join(", ")}`);
  }

  if (errors.length > 0) return { success: false, error: errors.join("; ") };
  return { success: true, data: d as unknown as LearningRecord };
}
