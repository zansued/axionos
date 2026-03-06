// Repair Evidence Contract Schema — AxionOS Sprint 6
// Canonical structure for recording structured repair attempts.

// ══════════════════════════════════════════════════
//  ENUMS
// ══════════════════════════════════════════════════

export type ErrorCategory =
  | "typescript_error"
  | "import_error"
  | "dependency_error"
  | "schema_error"
  | "runtime_error"
  | "build_config_error"
  | "deploy_error"
  | "unknown_error";

export type RepairResult =
  | "attempted"
  | "fixed"
  | "failed"
  | "partial";

export type RevalidationStatus =
  | "not_run"
  | "passed"
  | "failed";

// ══════════════════════════════════════════════════
//  REPAIR EVIDENCE CONTRACT
// ══════════════════════════════════════════════════

export interface RepairEvidence {
  repair_id: string;
  initiative_id: string;
  organization_id: string;
  stage_name: string;
  job_id: string | null;

  // Error classification
  error_category: ErrorCategory;
  error_code: string;
  error_message: string;
  error_signature: string;
  failure_context: Record<string, unknown>;

  // Repair action
  repair_strategy: string;
  repair_prompt_version: string | null;
  attempt_number: number;
  patch_summary: string;
  files_touched: string[];

  // Before/after validation
  validation_before: Record<string, unknown>;
  validation_after: Record<string, unknown>;

  // Outcome
  repair_result: RepairResult;
  revalidation_status: RevalidationStatus;
  duration_ms: number;

  created_at: string;
}

// ══════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════

/** Generate a deterministic error signature from category + code + truncated message */
export function computeErrorSignature(
  category: ErrorCategory,
  code: string,
  message: string,
): string {
  const normalised = message.replace(/['"]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
  return `${category}::${code}::${normalised}`;
}

// ══════════════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════════════

const ERROR_CATEGORIES: ErrorCategory[] = [
  "typescript_error", "import_error", "dependency_error", "schema_error",
  "runtime_error", "build_config_error", "deploy_error", "unknown_error",
];

const REPAIR_RESULTS: RepairResult[] = ["attempted", "fixed", "failed", "partial"];
const REVALIDATION_STATUSES: RevalidationStatus[] = ["not_run", "passed", "failed"];

export function validateRepairEvidence(
  data: unknown,
): { success: true; data: RepairEvidence } | { success: false; error: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Repair evidence must be an object" };
  }
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.repair_id || typeof d.repair_id !== "string") errors.push("repair_id required");
  if (!d.initiative_id || typeof d.initiative_id !== "string") errors.push("initiative_id required");
  if (!ERROR_CATEGORIES.includes(d.error_category as ErrorCategory)) {
    errors.push(`error_category must be one of: ${ERROR_CATEGORIES.join(", ")}`);
  }
  if (!REPAIR_RESULTS.includes(d.repair_result as RepairResult)) {
    errors.push(`repair_result must be one of: ${REPAIR_RESULTS.join(", ")}`);
  }
  if (!REVALIDATION_STATUSES.includes(d.revalidation_status as RevalidationStatus)) {
    errors.push(`revalidation_status must be one of: ${REVALIDATION_STATUSES.join(", ")}`);
  }

  if (errors.length > 0) return { success: false, error: errors.join("; ") };
  return { success: true, data: d as unknown as RepairEvidence };
}
