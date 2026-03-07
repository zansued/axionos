/**
 * Strategy Portfolio Conflict Detector — Sprint 33
 * Detects conflicts between strategies in a portfolio.
 * Pure functions. No DB access.
 */

export interface ConflictInput {
  member_id: string;
  strategy_family_id: string;
  family_key: string;
  lifecycle_status: string;
  exposure_weight: number;
  performance_score: number | null;
}

export interface OutcomeSignal {
  strategy_variant_id: string;
  strategy_family_id: string;
  outcome_status: string;
  applied_mode: string;
}

export type ConflictType =
  | "overlap"
  | "oscillation"
  | "mode_conflict"
  | "regression_correlation"
  | "exposure_imbalance";

export type ConflictSeverity = "low" | "medium" | "high" | "critical";

export interface DetectedConflict {
  conflict_type: ConflictType;
  affected_strategy_ids: string[];
  severity: ConflictSeverity;
  confidence: number;
  description: string;
  recommended_resolution: string;
}

const FORBIDDEN_MUTATION_FAMILIES = [
  "pipeline_topology",
  "governance_rules",
  "billing_logic",
  "plan_enforcement",
  "execution_contracts",
  "hard_safety_constraints",
];

export function detectConflicts(
  members: ConflictInput[],
  outcomes: OutcomeSignal[],
): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  // 1. Exposure imbalance: one strategy dominates >80%
  const totalWeight = members.reduce((a, m) => a + m.exposure_weight, 0);
  if (totalWeight > 0) {
    for (const m of members) {
      const share = m.exposure_weight / totalWeight;
      if (share > 0.8 && members.length > 1) {
        conflicts.push({
          conflict_type: "exposure_imbalance",
          affected_strategy_ids: [m.strategy_family_id],
          severity: "high",
          confidence: 0.9,
          description: `Strategy "${m.family_key}" dominates ${(share * 100).toFixed(0)}% of exposure`,
          recommended_resolution: "Rebalance exposure weights to reduce monoculture risk",
        });
      }
    }
  }

  // 2. Overlap: multiple active strategies targeting same family key prefix
  const activeMembers = members.filter(m => m.lifecycle_status === "active" || m.lifecycle_status === "experimental");
  const prefixGroups = new Map<string, ConflictInput[]>();
  for (const m of activeMembers) {
    const prefix = m.family_key.split("_").slice(0, 2).join("_");
    const group = prefixGroups.get(prefix) || [];
    group.push(m);
    prefixGroups.set(prefix, group);
  }
  for (const [prefix, group] of prefixGroups) {
    if (group.length > 2) {
      conflicts.push({
        conflict_type: "overlap",
        affected_strategy_ids: group.map(g => g.strategy_family_id),
        severity: "medium",
        confidence: 0.7,
        description: `${group.length} active strategies overlap in "${prefix}" domain`,
        recommended_resolution: "Consider merging or retiring redundant strategies",
      });
    }
  }

  // 3. Regression correlation: families with high harmful rate together
  const familyHarmful = new Map<string, number>();
  const familyCounts = new Map<string, number>();
  for (const o of outcomes) {
    familyCounts.set(o.strategy_family_id, (familyCounts.get(o.strategy_family_id) || 0) + 1);
    if (o.outcome_status === "harmful") {
      familyHarmful.set(o.strategy_family_id, (familyHarmful.get(o.strategy_family_id) || 0) + 1);
    }
  }
  const highHarmful: string[] = [];
  for (const [fid, count] of familyCounts) {
    const harmful = familyHarmful.get(fid) || 0;
    if (count >= 5 && harmful / count > 0.3) {
      highHarmful.push(fid);
    }
  }
  if (highHarmful.length >= 2) {
    conflicts.push({
      conflict_type: "regression_correlation",
      affected_strategy_ids: highHarmful,
      severity: "high",
      confidence: 0.75,
      description: `${highHarmful.length} strategy families show correlated regression patterns`,
      recommended_resolution: "Investigate shared dependencies and consider rollback of worst performer",
    });
  }

  return conflicts;
}

export function validateNoForbiddenMutations(familyKey: string): boolean {
  return !FORBIDDEN_MUTATION_FAMILIES.some(f => familyKey.includes(f));
}
