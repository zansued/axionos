/**
 * Convergence Explainer — Sprint 49
 * Returns structured explanations for convergence scores and recommendations.
 * Pure functions. No DB access.
 */

export interface ExplainableScore {
  score_name: string;
  value: number;
  contributing_factors: string[];
  explanation: string;
}

export function explainConvergenceScore(params: {
  score_name: string;
  value: number;
  rationale_codes: string[];
  confidence: number;
}): ExplainableScore {
  const { score_name, value, rationale_codes, confidence } = params;

  const explanationParts: string[] = [];

  if (value > 0.7) explanationParts.push(`High ${score_name} (${value.toFixed(2)}) indicates strong signal.`);
  else if (value > 0.4) explanationParts.push(`Moderate ${score_name} (${value.toFixed(2)}) suggests further analysis.`);
  else explanationParts.push(`Low ${score_name} (${value.toFixed(2)}) indicates minimal concern.`);

  if (confidence < 0.4) explanationParts.push("Low confidence — treat as preliminary.");
  if (rationale_codes.length > 0) explanationParts.push(`Based on: ${rationale_codes.join(", ")}.`);

  return {
    score_name,
    value,
    contributing_factors: rationale_codes,
    explanation: explanationParts.join(" "),
  };
}

export function explainConvergenceRecommendation(params: {
  recommendation_type: string;
  target_entities: Array<{ key: string; type: string }>;
  priority_score: number;
  confidence_score: number;
  rationale_codes: string[];
  expected_value: number;
}): { summary: string; details: string[]; risk_notes: string[] } {
  const details: string[] = [];
  const risks: string[] = [];

  details.push(`Action: ${params.recommendation_type} on ${params.target_entities.map(e => e.key).join(", ")}`);
  details.push(`Priority: ${params.priority_score.toFixed(2)}, Confidence: ${params.confidence_score.toFixed(2)}`);
  details.push(`Expected value: ${params.expected_value.toFixed(4)}`);

  if (params.confidence_score < 0.4) risks.push("Low confidence — requires additional evidence before action.");
  if (params.recommendation_type.includes("merge") || params.recommendation_type.includes("retire")) {
    risks.push("Structural convergence action — requires human review before execution.");
  }

  const summary = `${params.recommendation_type}: ${params.rationale_codes.slice(0, 3).join(", ")} (priority ${params.priority_score.toFixed(2)})`;

  return { summary, details, risk_notes: risks };
}
