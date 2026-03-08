/**
 * Architecture Portfolio Prioritizer — Sprint 43
 *
 * Ranks architectural change work by value, readiness, risk and alignment.
 */

export interface PortfolioMemberScore {
  member_id: string;
  expected_value: number;
  confidence: number;
  readiness: number;
  blast_radius: number;
  risk_concentration: number;
  debt_reduction: number;
  tenant_sensitivity: number;
  recurrence: number;
  strategic_alignment: number;
}

export interface PriorityResult {
  member_id: string;
  priority_score: number;
  sequencing: "proceed" | "defer" | "suppress";
  rationale: string[];
}

export function prioritizeMembers(members: PortfolioMemberScore[]): PriorityResult[] {
  return members.map(m => {
    const score =
      m.expected_value * 0.20 +
      m.confidence * 0.10 +
      m.readiness * 0.15 +
      (1 - m.blast_radius) * 0.15 +
      (1 - m.risk_concentration) * 0.10 +
      m.debt_reduction * 0.10 +
      (1 - m.tenant_sensitivity) * 0.05 +
      m.recurrence * 0.05 +
      m.strategic_alignment * 0.10;

    const rationale: string[] = [];
    let sequencing: "proceed" | "defer" | "suppress" = "proceed";

    if (m.blast_radius > 0.7) {
      rationale.push("High blast radius — requires elevated review");
      sequencing = "defer";
    }
    if (m.risk_concentration > 0.8) {
      rationale.push("Risk concentration too high — suppress until reduced");
      sequencing = "suppress";
    }
    if (m.readiness < 0.3) {
      rationale.push("Low readiness — defer until prerequisites met");
      if (sequencing === "proceed") sequencing = "defer";
    }
    if (rationale.length === 0) {
      rationale.push("Within acceptable thresholds");
    }

    return { member_id: m.member_id, priority_score: round(score), sequencing, rationale };
  }).sort((a, b) => b.priority_score - a.priority_score);
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
