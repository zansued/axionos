/**
 * security-canon-explainer.ts
 * Generates human-readable explanations for security canon entries.
 */

export interface CanonExplainerInput {
  pattern_type: string;
  title: string;
  summary: string;
  agent_types: string[];
  confidence_score: number;
  status: string;
}

export interface CanonExplanation {
  what_it_is: string;
  who_uses_it: string;
  why_it_matters: string;
  confidence_note: string;
}

export function explainSecurityCanon(input: CanonExplainerInput): CanonExplanation {
  const typeLabel = input.pattern_type.replace(/_/g, " ");
  return {
    what_it_is: `${typeLabel}: ${input.summary}`,
    who_uses_it: input.agent_types.length > 0 ? `Retrieved by: ${input.agent_types.join(", ")}` : "Available to all agents.",
    why_it_matters: `This ${typeLabel} was derived from real red/blue team evidence and helps prevent known vulnerabilities during software generation.`,
    confidence_note: input.confidence_score >= 80
      ? "High confidence — validated through multiple simulations or incidents."
      : input.confidence_score >= 50
      ? "Moderate confidence — based on limited evidence, may need further validation."
      : "Low confidence — early-stage candidate, requires steward review.",
  };
}
