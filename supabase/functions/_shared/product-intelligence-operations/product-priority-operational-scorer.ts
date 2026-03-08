/**
 * Product Priority Operational Scorer — Sprint 54
 * Scores operational priority of product-informed recommendations.
 */

export interface PriorityInput {
  id: string;
  productArea?: string;
  adoptionScore: number;
  retentionScore: number;
  frictionScore: number;
  valueScore: number;
  architectureAlignmentScore: number;
  profileAlignmentScore: number;
  confidenceScore: number;
  noisePenalty: number;
}

export interface PriorityResult {
  id: string;
  productArea?: string;
  priorityScore: number;
  rank: number;
  reasoning: string;
}

export function scoreOperationalPriority(inputs: PriorityInput[]): PriorityResult[] {
  const scored = inputs.map(input => {
    const productValue = input.adoptionScore * 0.2 + input.retentionScore * 0.2 +
      (1 - input.frictionScore) * 0.2 + input.valueScore * 0.2;
    const fit = input.architectureAlignmentScore * 0.5 + input.profileAlignmentScore * 0.5;
    const raw = productValue * 0.5 + fit * 0.3 + input.confidenceScore * 0.2;
    const priority = Math.max(0, Math.min(1, raw - input.noisePenalty * 0.3));

    const reasons: string[] = [];
    if (input.confidenceScore < 0.4) reasons.push('low confidence');
    if (input.noisePenalty > 0.2) reasons.push('noise penalty applied');
    if (fit < 0.4) reasons.push('poor arch/profile fit downgrades priority');
    if (productValue >= 0.7) reasons.push('strong product value signal');
    const reasoning = reasons.length > 0 ? reasons.join('; ') : 'balanced priority assessment';

    return { id: input.id, productArea: input.productArea, priorityScore: round(priority), rank: 0, reasoning };
  });

  scored.sort((a, b) => b.priorityScore - a.priorityScore);
  scored.forEach((s, i) => { s.rank = i + 1; });
  return scored;
}

function round(v: number): number { return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100; }
