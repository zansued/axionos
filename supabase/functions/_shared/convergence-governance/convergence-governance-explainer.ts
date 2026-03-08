/**
 * Convergence Governance Explainer — Sprint 50
 * Generates structured explanations for governance scores, decisions, and tradeoffs.
 * Pure functions. No DB access.
 */

export function explainGovernanceCase(params: {
  governance_case_type: string;
  proposed_action: string;
  promotion_readiness_score: number;
  retirement_readiness_score: number;
  confidence_score: number;
  rationale_codes: string[];
}): { summary: string; details: string[]; risk_notes: string[] } {
  const details: string[] = [];
  const risks: string[] = [];

  details.push(`Case type: ${params.governance_case_type}`);
  details.push(`Proposed action: ${params.proposed_action}`);
  details.push(`Promotion readiness: ${params.promotion_readiness_score.toFixed(2)}`);
  details.push(`Retirement readiness: ${params.retirement_readiness_score.toFixed(2)}`);
  details.push(`Confidence: ${params.confidence_score.toFixed(2)}`);

  if (params.confidence_score < 0.4) risks.push("Low confidence — requires additional evidence.");
  if (params.proposed_action === "promote_shared") risks.push("Promotion requires cross-tenant compatibility validation.");
  if (params.proposed_action === "retire") risks.push("Retirement requires dependency impact analysis.");
  if (params.proposed_action === "bounded_merge") risks.push("Merge requires rollback plan before execution.");

  const summary = `${params.governance_case_type}: ${params.proposed_action} (confidence ${params.confidence_score.toFixed(2)}, ${params.rationale_codes.slice(0, 3).join(", ")})`;

  return { summary, details, risk_notes: risks };
}

export function explainDecisionComparison(scenarios: Array<{
  action: string;
  score: number;
  safety: number;
  rationale: string[];
}>): { best_action: string; comparison: Array<{ action: string; score: number; safety: number; advantage: string }> } {
  const sorted = [...scenarios].sort((a, b) => b.score - a.score);
  return {
    best_action: sorted[0]?.action || "retain_local",
    comparison: sorted.map(s => ({
      action: s.action,
      score: s.score,
      safety: s.safety,
      advantage: s.rationale[0] || "none",
    })),
  };
}
