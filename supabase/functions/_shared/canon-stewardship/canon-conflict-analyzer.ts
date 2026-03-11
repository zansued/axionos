/**
 * Canon Conflict Analyzer — Sprint 140
 * Identifies conflicts between canon entries.
 */

export interface ConflictCheckInput {
  entry_id: string;
  title: string;
  practice_type: string;
  anti_pattern_flag: boolean;
  stack_scope: string;
  topic: string;
}

export interface ConflictAnalysisResult {
  has_conflicts: boolean;
  conflicts: Array<{
    conflicting_entry_id: string;
    conflict_type: string;
    severity: string;
    description: string;
  }>;
}

export function analyzeConflicts(
  candidate: ConflictCheckInput,
  existing: ConflictCheckInput[]
): ConflictAnalysisResult {
  const conflicts: ConflictAnalysisResult["conflicts"] = [];

  for (const entry of existing) {
    if (entry.entry_id === candidate.entry_id) continue;

    // Anti-pattern vs best practice in same scope
    if (
      candidate.anti_pattern_flag !== entry.anti_pattern_flag &&
      candidate.topic === entry.topic &&
      candidate.stack_scope === entry.stack_scope
    ) {
      conflicts.push({
        conflicting_entry_id: entry.entry_id,
        conflict_type: "pattern_antipattern_clash",
        severity: "medium",
        description: `Entry "${entry.title}" is ${entry.anti_pattern_flag ? "anti-pattern" : "pattern"} in same topic/scope`,
      });
    }

    // Same practice type + topic overlap
    if (
      candidate.practice_type === entry.practice_type &&
      candidate.topic === entry.topic &&
      candidate.stack_scope === entry.stack_scope &&
      candidate.entry_id !== entry.entry_id
    ) {
      conflicts.push({
        conflicting_entry_id: entry.entry_id,
        conflict_type: "overlap",
        severity: "low",
        description: `Entry "${entry.title}" has same practice_type and topic in same scope`,
      });
    }
  }

  return {
    has_conflicts: conflicts.length > 0,
    conflicts,
  };
}
