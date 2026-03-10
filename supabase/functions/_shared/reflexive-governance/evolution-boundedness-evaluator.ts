/**
 * Evolution Boundedness Evaluator — Sprint 111
 * Evaluates whether a proposed change is properly scoped.
 */

export interface BoundednessInput {
  target_scope: string;
  target_layer: string;
  affected_modules: string[];
  affected_stages: string[];
  cross_layer_impact: boolean;
  estimated_files_changed: number;
  estimated_tables_changed: number;
}

export interface BoundednessResult {
  posture: "strictly_bounded" | "loosely_bounded" | "unbounded";
  score: number;      // 0-100 (higher = more bounded)
  risk_factors: string[];
  recommendation: string;
}

export function evaluateBoundedness(input: BoundednessInput): BoundednessResult {
  let score = 100;
  const risks: string[] = [];

  if (input.cross_layer_impact) { score -= 25; risks.push("Cross-layer impact detected"); }
  if (input.affected_modules.length > 5) { score -= 20; risks.push(`${input.affected_modules.length} modules affected`); }
  else if (input.affected_modules.length > 2) { score -= 10; }
  if (input.affected_stages.length > 3) { score -= 15; risks.push(`${input.affected_stages.length} pipeline stages affected`); }
  if (input.estimated_files_changed > 20) { score -= 15; risks.push("Large file footprint"); }
  else if (input.estimated_files_changed > 10) { score -= 8; }
  if (input.estimated_tables_changed > 3) { score -= 10; risks.push("Multiple table changes"); }
  if (input.target_layer === "cross_layer") { score -= 15; risks.push("Cross-layer target"); }

  score = Math.max(score, 0);

  const posture = score >= 70 ? "strictly_bounded" : score >= 40 ? "loosely_bounded" : "unbounded";
  const recommendation = posture === "strictly_bounded"
    ? "Scope is well-defined. Proceed with standard review."
    : posture === "loosely_bounded"
    ? "Consider splitting into smaller, more bounded proposals."
    : "Proposal scope is too broad. Must be decomposed before review.";

  return { posture, score, risk_factors: risks, recommendation };
}
