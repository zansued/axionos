/**
 * Product Opportunity Conflict Detector — Sprint 55
 * Detects overlap, cannibalization, sequencing tension, and portfolio conflict patterns.
 */

export interface ConflictInput {
  id: string;
  product_area?: string;
  scope_refs: string[];
  intent?: string;
  governance_state: string;
  expected_value_score: number;
}

export interface OpportunityConflict {
  conflict_type: string;
  affected_items: string[];
  severity: "low" | "medium" | "high" | "critical";
  confidence_score: number;
  overlap_score: number;
  cannibalization_score: number;
  recommended_resolution: string;
  description: string;
}

export function detectOpportunityConflicts(items: ConflictInput[]): OpportunityConflict[] {
  const conflicts: OpportunityConflict[] = [];
  const active = items.filter(i => !["rejected", "archived"].includes(i.governance_state));

  // Scope overlap detection
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      const scopeOverlap = a.scope_refs.filter(s => b.scope_refs.includes(s));
      if (scopeOverlap.length > 0) {
        const overlapRatio = scopeOverlap.length / Math.max(a.scope_refs.length, b.scope_refs.length, 1);

        if (overlapRatio > 0.5) {
          const isCannibalization = a.product_area === b.product_area && a.intent === b.intent;
          conflicts.push({
            conflict_type: isCannibalization ? "cannibalization" : "overlap",
            affected_items: [a.id, b.id],
            severity: overlapRatio > 0.8 ? "high" : "medium",
            confidence_score: round(0.6 + overlapRatio * 0.3),
            overlap_score: round(overlapRatio),
            cannibalization_score: isCannibalization ? round(overlapRatio * 0.9) : 0,
            recommended_resolution: isCannibalization
              ? "Consider merging these opportunities to avoid resource waste"
              : "Sequence these opportunities to reduce concurrent scope collision",
            description: `${scopeOverlap.length} shared scope refs between items`,
          });
        }
      }
    }
  }

  // Product area concentration
  const areaGroups = new Map<string, ConflictInput[]>();
  for (const item of active) {
    if (!item.product_area) continue;
    const group = areaGroups.get(item.product_area) || [];
    group.push(item);
    areaGroups.set(item.product_area, group);
  }
  for (const [area, group] of areaGroups) {
    if (group.length > 3) {
      conflicts.push({
        conflict_type: "resource_contention",
        affected_items: group.map(g => g.id),
        severity: group.length > 5 ? "critical" : "high",
        confidence_score: 0.8,
        overlap_score: round(group.length / active.length),
        cannibalization_score: 0,
        recommended_resolution: `Too many opportunities in "${area}" — prioritize and defer lower-value items`,
        description: `${group.length} opportunities concentrated in product area "${area}"`,
      });
    }
  }

  return conflicts;
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
