/**
 * Architecture Portfolio Conflict Detector — Sprint 43
 *
 * Detects conflicts across architectural initiatives in a portfolio.
 */

export interface PortfolioConflictInput {
  member_id: string;
  member_type: string;
  scope_refs: string[];
  blast_zone: string;
  intent: string; // e.g. "increase_modularity", "consolidate_services"
  lifecycle_state: string;
}

export interface PortfolioConflict {
  conflict_type: string;
  affected_members: string[];
  severity: "low" | "medium" | "high" | "critical";
  confidence_score: number;
  recommended_resolution: string;
  description: string;
}

export function detectPortfolioConflicts(members: PortfolioConflictInput[]): PortfolioConflict[] {
  const conflicts: PortfolioConflict[] = [];
  const active = members.filter(m => !["deprecated", "archived"].includes(m.lifecycle_state));

  // Overlapping blast zones
  const blastGroups = new Map<string, PortfolioConflictInput[]>();
  for (const m of active) {
    if (!m.blast_zone) continue;
    const group = blastGroups.get(m.blast_zone) || [];
    group.push(m);
    blastGroups.set(m.blast_zone, group);
  }
  for (const [zone, group] of blastGroups) {
    if (group.length > 1) {
      conflicts.push({
        conflict_type: "blast_zone_overlap",
        affected_members: group.map(g => g.member_id),
        severity: group.length > 3 ? "critical" : group.length > 2 ? "high" : "medium",
        confidence_score: 0.85,
        recommended_resolution: `Sequence changes in blast zone "${zone}" to avoid concurrent impact`,
        description: `${group.length} members share blast zone "${zone}"`,
      });
    }
  }

  // Contradictory intents
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      const scopeOverlap = a.scope_refs.some(s => b.scope_refs.includes(s));
      if (scopeOverlap && a.intent && b.intent && areContradictory(a.intent, b.intent)) {
        conflicts.push({
          conflict_type: "contradictory_intent",
          affected_members: [a.member_id, b.member_id],
          severity: "high",
          confidence_score: 0.75,
          recommended_resolution: "Review and consolidate contradictory architectural intents",
          description: `Intent "${a.intent}" contradicts "${b.intent}" in overlapping scope`,
        });
      }
    }
  }

  return conflicts;
}

const CONTRADICTIONS = new Map([
  ["increase_modularity", "consolidate_services"],
  ["consolidate_services", "increase_modularity"],
  ["add_abstraction", "reduce_abstraction"],
  ["reduce_abstraction", "add_abstraction"],
]);

function areContradictory(a: string, b: string): boolean {
  return CONTRADICTIONS.get(a) === b;
}
