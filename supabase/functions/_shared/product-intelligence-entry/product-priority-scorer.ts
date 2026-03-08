/**
 * Product Priority Scorer
 * Ranks product-informed opportunities by value, feasibility, confidence, and governance fit.
 */

export interface PriorityInput {
  id: string;
  title: string;
  opportunityScore: number;
  confidenceScore: number;
  feasibilityScore: number;
  architectureAlignment: number;
  profileAlignment: number;
  frictionCorrelation: number;
  noisePenalty?: number;
}

export interface PriorityResult {
  id: string;
  title: string;
  priorityScore: number;
  confidenceAdjusted: number;
  rank: number;
  rationale: string;
}

export function rankByPriority(inputs: PriorityInput[]): PriorityResult[] {
  const scored = inputs.map(input => {
    const noise = input.noisePenalty || 0;
    const adjustedConfidence = Math.max(0, input.confidenceScore - noise * 0.5);

    // High value + low confidence = deprioritized (bounded)
    const priority =
      input.opportunityScore * 0.25 +
      adjustedConfidence * 0.20 +
      input.feasibilityScore * 0.15 +
      input.architectureAlignment * 0.15 +
      input.profileAlignment * 0.10 +
      input.frictionCorrelation * 0.15;

    const priorityScore = Math.round(Math.min(1, priority) * 100) / 100;

    let rationale = '';
    if (priorityScore >= 0.7) rationale = 'Strong candidate — high value with good alignment and confidence';
    else if (priorityScore >= 0.4) rationale = 'Moderate candidate — review feasibility and alignment gaps';
    else rationale = 'Low priority — insufficient confidence or poor alignment';

    return {
      id: input.id,
      title: input.title,
      priorityScore,
      confidenceAdjusted: Math.round(adjustedConfidence * 100) / 100,
      rank: 0,
      rationale,
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  scored.forEach((s, i) => s.rank = i + 1);
  return scored;
}
