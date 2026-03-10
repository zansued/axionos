/**
 * Evolution Justification Engine — Sprint 111
 * Evaluates the quality and completeness of a proposal's justification.
 */

export interface JustificationInput {
  problem_statement: string;
  justification_summary: string;
  expected_benefit: string;
  triggering_signals: Record<string, unknown>[];
  evidence_count: number;
  recurrence_count: number;
  complexity_cost: number;
}

export interface JustificationResult {
  score: number;              // 0-100
  quality: string;            // strong, adequate, weak, insufficient
  completeness_flags: Record<string, boolean>;
  feedback: string[];
}

export function evaluateJustification(input: JustificationInput): JustificationResult {
  let score = 0;
  const feedback: string[] = [];
  const flags: Record<string, boolean> = {};

  // Problem clarity
  flags.has_problem = input.problem_statement.length >= 20;
  if (flags.has_problem) score += 15; else feedback.push("Problem statement is too brief.");

  // Justification depth
  flags.has_justification = input.justification_summary.length >= 30;
  if (flags.has_justification) score += 20; else feedback.push("Justification needs more detail.");

  // Expected benefit
  flags.has_benefit = input.expected_benefit.length >= 10;
  if (flags.has_benefit) score += 15; else feedback.push("Expected benefit is vague.");

  // Evidence basis
  flags.has_evidence = input.evidence_count >= 1;
  flags.strong_evidence = input.evidence_count >= 3;
  if (flags.strong_evidence) score += 20;
  else if (flags.has_evidence) score += 10;
  else feedback.push("No evidence provided.");

  // Triggering signals
  flags.has_signals = input.triggering_signals.length >= 1;
  if (flags.has_signals) score += 10; else feedback.push("No triggering signals referenced.");

  // Recurrence
  flags.has_recurrence = input.recurrence_count >= 2;
  if (flags.has_recurrence) score += 10; else if (input.recurrence_count === 0) feedback.push("No recurrence history — may be premature.");

  // Proportionality
  flags.proportional = input.complexity_cost <= 50 || input.evidence_count >= 3;
  if (flags.proportional) score += 10; else feedback.push("Complexity cost seems disproportionate to evidence.");

  const quality = score >= 75 ? "strong" : score >= 50 ? "adequate" : score >= 30 ? "weak" : "insufficient";

  return { score, quality, completeness_flags: flags, feedback };
}
