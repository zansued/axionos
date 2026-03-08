/**
 * Advisory Conflict Resolver — Sprint 45
 * Detects and resolves conflicts between advisory change items.
 * Pure functions. No DB access.
 */

import type { NormalizedChangeOpportunity } from "./change-opportunity-normalizer.ts";

export interface AdvisoryConflict {
  conflict_type: string;
  conflicting_items: string[];
  severity: "low" | "medium" | "high" | "critical";
  preferred_resolution: string;
  suppression_recommendation: string | null;
  deferment_recommendation: string | null;
}

export interface ConflictResolutionResult {
  conflicts: AdvisoryConflict[];
  conflict_count: number;
  high_severity_count: number;
}

export function detectConflicts(opportunities: NormalizedChangeOpportunity[]): ConflictResolutionResult {
  const conflicts: AdvisoryConflict[] = [];

  if (opportunities.length < 2) {
    return { conflicts: [], conflict_count: 0, high_severity_count: 0 };
  }

  // Scope overlap: multiple changes targeting the same scope
  const scopeMap = new Map<string, NormalizedChangeOpportunity[]>();
  for (const opp of opportunities) {
    const list = scopeMap.get(opp.affected_scope) || [];
    list.push(opp);
    scopeMap.set(opp.affected_scope, list);
  }

  for (const [scope, items] of scopeMap) {
    if (items.length > 3) {
      conflicts.push({
        conflict_type: "scope_overload",
        conflicting_items: items.map((i) => i.signal_id),
        severity: items.length > 5 ? "critical" : "high",
        preferred_resolution: `Limit concurrent changes in scope "${scope}" to 3`,
        suppression_recommendation: "Suppress lowest-priority items",
        deferment_recommendation: `Defer ${items.length - 3} items`,
      });
    }
  }

  // Contradictory types in same scope
  for (const [scope, items] of scopeMap) {
    const types = new Set(items.map((i) => i.normalized_change_type));
    if (types.has("architecture_remediation") && types.has("architecture_improvement")) {
      conflicts.push({
        conflict_type: "contradictory_intent",
        conflicting_items: items.map((i) => i.signal_id),
        severity: "medium",
        preferred_resolution: `Resolve remediation before improvement in scope "${scope}"`,
        suppression_recommendation: null,
        deferment_recommendation: "Defer improvement until remediation completes",
      });
    }
  }

  // High cumulative risk
  const totalRisk = opportunities.reduce((sum, o) => sum + o.risk_score, 0);
  if (totalRisk > opportunities.length * 0.6) {
    conflicts.push({
      conflict_type: "cumulative_risk_overload",
      conflicting_items: opportunities.filter((o) => o.risk_score > 0.6).map((o) => o.signal_id),
      severity: "high",
      preferred_resolution: "Reduce concurrent high-risk changes",
      suppression_recommendation: null,
      deferment_recommendation: "Defer high-risk items to future agenda cycle",
    });
  }

  const highSeverity = conflicts.filter((c) => c.severity === "high" || c.severity === "critical").length;

  return { conflicts, conflict_count: conflicts.length, high_severity_count: highSeverity };
}
