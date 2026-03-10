/**
 * Canon Conflict Detector — Sprint 118
 * Detects conflicts between external candidates and existing canon.
 */

export interface ConflictCheckInput {
  candidate_stack_scope: string;
  candidate_knowledge_type: string;
  candidate_summary: string;
  existing_entries: Array<{
    id: string;
    stack_scope: string;
    canon_type: string;
    summary: string;
    lifecycle_status: string;
  }>;
}

export interface ConflictResult {
  has_conflicts: boolean;
  conflicts: Array<{
    existing_entry_id: string;
    conflict_type: string;
    severity: string;
    description: string;
  }>;
}

export function detectCanonConflicts(input: ConflictCheckInput): ConflictResult {
  const conflicts: ConflictResult["conflicts"] = [];

  for (const entry of input.existing_entries) {
    if (entry.lifecycle_status === "deprecated" || entry.lifecycle_status === "archived") continue;

    const scopeOverlap = entry.stack_scope === input.candidate_stack_scope && input.candidate_stack_scope !== "";
    const typeMatch = entry.canon_type === input.candidate_knowledge_type;

    if (scopeOverlap && typeMatch) {
      conflicts.push({
        existing_entry_id: entry.id,
        conflict_type: "scope_overlap",
        severity: entry.lifecycle_status === "approved" ? "high" : "medium",
        description: `Candidate overlaps with existing ${entry.lifecycle_status} entry in scope '${entry.stack_scope}'.`,
      });
    }
  }

  return { has_conflicts: conflicts.length > 0, conflicts };
}
