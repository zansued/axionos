/**
 * Architecture Portfolio Explainability — Sprint 43
 */

export interface PortfolioExplanation {
  portfolio_id: string;
  portfolio_theme: string;
  active_members: number;
  conflicting_members: number;
  cumulative_blast_summary: string;
  conflict_summary: string[];
  prioritization_rationale: string[];
  health_status: string;
  safety_notes: string[];
}

export function buildPortfolioExplanation(
  portfolio: Record<string, unknown>,
  health: { overall_health: string; cumulative_blast_index: number },
  conflictCount: number,
  activeCount: number,
): PortfolioExplanation {
  const safety = [
    "Cannot mutate topology directly",
    "Cannot alter governance/billing/enforcement",
    "Cannot auto-approve migrations",
    "Cannot override tenant isolation",
    "All outputs remain review-driven and auditable",
  ];

  const conflictSummary: string[] = [];
  if (conflictCount > 0) conflictSummary.push(`${conflictCount} active conflicts detected`);
  else conflictSummary.push("No active conflicts");

  return {
    portfolio_id: String(portfolio.id || ""),
    portfolio_theme: String(portfolio.portfolio_theme || ""),
    active_members: activeCount,
    conflicting_members: conflictCount,
    cumulative_blast_summary: `Cumulative blast index: ${(health.cumulative_blast_index * 100).toFixed(0)}%`,
    conflict_summary: conflictSummary,
    prioritization_rationale: ["Members ranked by value, readiness, risk and alignment"],
    health_status: health.overall_health,
    safety_notes: safety,
  };
}
