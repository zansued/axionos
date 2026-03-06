// Error Pattern Contract Schema — AxionOS Sprint 7
// Canonical structure for recurring error knowledge.

// ══════════════════════════════════════════════════
//  ENUMS
// ══════════════════════════════════════════════════

export type PatternSeverity = "low" | "medium" | "high" | "critical";
export type PatternRepairability = "high" | "medium" | "low" | "unknown";

// ══════════════════════════════════════════════════
//  ERROR PATTERN CONTRACT
// ══════════════════════════════════════════════════

export interface ErrorPattern {
  pattern_id: string;
  organization_id: string;
  error_category: string;
  error_signature: string;
  normalized_signature: string;
  title: string;
  description: string;
  frequency: number;
  first_seen_at: string;
  last_seen_at: string;
  affected_stages: string[];
  affected_file_types: string[];
  common_causes: string[];
  successful_strategies: string[];
  failed_strategies: string[];
  success_rate: number;
  severity: PatternSeverity;
  repairability: PatternRepairability;
  recommended_prevention: string | null;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

// ══════════════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════════════

const SEVERITIES: PatternSeverity[] = ["low", "medium", "high", "critical"];
const REPAIRABILITIES: PatternRepairability[] = ["high", "medium", "low", "unknown"];

export function validateErrorPattern(
  data: unknown,
): { success: true; data: ErrorPattern } | { success: false; error: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Error pattern must be an object" };
  }
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.pattern_id || typeof d.pattern_id !== "string") errors.push("pattern_id required");
  if (!d.organization_id || typeof d.organization_id !== "string") errors.push("organization_id required");
  if (!d.error_category || typeof d.error_category !== "string") errors.push("error_category required");
  if (!d.normalized_signature || typeof d.normalized_signature !== "string") errors.push("normalized_signature required");
  if (!SEVERITIES.includes(d.severity as PatternSeverity)) {
    errors.push(`severity must be one of: ${SEVERITIES.join(", ")}`);
  }
  if (!REPAIRABILITIES.includes(d.repairability as PatternRepairability)) {
    errors.push(`repairability must be one of: ${REPAIRABILITIES.join(", ")}`);
  }
  if (typeof d.frequency !== "number" || d.frequency < 0) errors.push("frequency must be a non-negative number");

  if (errors.length > 0) return { success: false, error: errors.join("; ") };
  return { success: true, data: d as unknown as ErrorPattern };
}
