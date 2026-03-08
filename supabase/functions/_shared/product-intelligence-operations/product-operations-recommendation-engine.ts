/**
 * Product Operations Recommendation Engine — Sprint 54
 * Produces advisory-first operational recommendations informed by product evidence.
 */

export interface RecommendationInput {
  productArea: string;
  adoptionScore: number;
  retentionScore: number;
  frictionScore: number;
  valueScore: number;
  architectureAlignmentScore: number;
  profileAlignmentScore: number;
  confidenceScore: number;
  noisePenalty: number;
  benchmarkRank?: number;
}

export interface OperationalRecommendation {
  productArea: string;
  recommendationType: string;
  title: string;
  description: string;
  rationale: string;
  priorityScore: number;
  confidenceScore: number;
  expectedImpactScore: number;
}

export function generateOperationalRecommendations(inputs: RecommendationInput[]): OperationalRecommendation[] {
  const recommendations: OperationalRecommendation[] = [];

  for (const input of inputs) {
    if (input.confidenceScore < 0.3 || input.noisePenalty > 0.4) continue;

    if (input.frictionScore >= 0.7 && input.adoptionScore >= 0.4) {
      recommendations.push({
        productArea: input.productArea,
        recommendationType: 'friction_reduction',
        title: `High friction in ${input.productArea || 'product area'}`,
        description: `Friction score (${input.frictionScore.toFixed(2)}) is elevated despite meaningful adoption. Investigate root causes.`,
        rationale: `High friction with non-trivial adoption suggests a fixable bottleneck rather than a product-market mismatch.`,
        priorityScore: round(0.7 + input.adoptionScore * 0.15 - input.noisePenalty * 0.2),
        confidenceScore: round(input.confidenceScore),
        expectedImpactScore: round(input.adoptionScore * 0.5 + (1 - input.frictionScore) * 0.3 + 0.2),
      });
    }

    if (input.valueScore >= 0.7 && input.architectureAlignmentScore < 0.4) {
      recommendations.push({
        productArea: input.productArea,
        recommendationType: 'architecture_review',
        title: `Architecture misalignment in high-value area: ${input.productArea || 'product area'}`,
        description: `High product value (${input.valueScore.toFixed(2)}) but low architecture alignment (${input.architectureAlignmentScore.toFixed(2)}).`,
        rationale: `Product value is constrained by architectural fit. Review architecture mode applicability.`,
        priorityScore: round(0.6 + input.valueScore * 0.2 - input.noisePenalty * 0.2),
        confidenceScore: round(input.confidenceScore * 0.8),
        expectedImpactScore: round(input.valueScore * 0.6 + input.architectureAlignmentScore * 0.2 + 0.2),
      });
    }

    if (input.retentionScore < 0.3 && input.adoptionScore >= 0.5) {
      recommendations.push({
        productArea: input.productArea,
        recommendationType: 'retention_improvement',
        title: `Low retention despite adoption in ${input.productArea || 'product area'}`,
        description: `Adoption (${input.adoptionScore.toFixed(2)}) is healthy but retention (${input.retentionScore.toFixed(2)}) is weak.`,
        rationale: `Users adopt but don't stay — investigate value delivery, onboarding quality, or friction barriers.`,
        priorityScore: round(0.65 + input.adoptionScore * 0.15 - input.noisePenalty * 0.2),
        confidenceScore: round(input.confidenceScore),
        expectedImpactScore: round(0.5 + input.adoptionScore * 0.3),
      });
    }

    if (input.profileAlignmentScore < 0.3 && input.valueScore >= 0.5) {
      recommendations.push({
        productArea: input.productArea,
        recommendationType: 'profile_review',
        title: `Profile misalignment for ${input.productArea || 'product area'}`,
        description: `Operating profile alignment (${input.profileAlignmentScore.toFixed(2)}) is low for a valuable product area.`,
        rationale: `Current operating profiles may not fit this product area's needs. Consider profile tuning.`,
        priorityScore: round(0.5 + input.valueScore * 0.2),
        confidenceScore: round(input.confidenceScore * 0.7),
        expectedImpactScore: round(0.4 + input.valueScore * 0.3),
      });
    }
  }

  recommendations.sort((a, b) => b.priorityScore - a.priorityScore);
  return recommendations;
}

function round(v: number): number { return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100; }
