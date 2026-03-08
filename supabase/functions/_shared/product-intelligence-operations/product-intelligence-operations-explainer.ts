/**
 * Product Intelligence Operations Explainer — Sprint 54
 * Returns structured explanations for benchmark rankings, quality scores, and recommendations.
 */

export interface ExplainableEntity {
  type: string;
  data: Record<string, any>;
}

export interface Explanation {
  entityType: string;
  summary: string;
  factors: { factor: string; value: any; impact: string }[];
  limitations: string[];
}

export function explainEntity(entity: ExplainableEntity): Explanation {
  const factors: { factor: string; value: any; impact: string }[] = [];
  const limitations: string[] = [];
  let summary = '';

  switch (entity.type) {
    case 'benchmark': {
      const d = entity.data;
      summary = `Benchmark for scope ${d.benchmark_scope_type || 'unknown'} ranked #${d.benchmark_rank || '?'}`;
      factors.push(
        { factor: 'adoption_score', value: d.adoption_score, impact: 'Contributes to composite ranking (25%)' },
        { factor: 'retention_score', value: d.retention_score, impact: 'Contributes to composite ranking (20%)' },
        { factor: 'friction_score', value: d.friction_score, impact: 'Inverse contribution to composite (20%)' },
        { factor: 'value_score', value: d.value_score, impact: 'Contributes to composite ranking (20%)' },
        { factor: 'signal_quality', value: d.product_signal_quality_score, impact: 'Quality floor for ranking (15%)' },
        { factor: 'noise_penalty', value: d.signal_noise_penalty_score, impact: 'Reduces priority if noisy' },
      );
      if (d.confidence_score < 0.5) limitations.push('Low confidence — ranking may shift with more data');
      if (d.signal_noise_penalty_score > 0.2) limitations.push('High noise penalty reduces reliability');
      break;
    }
    case 'recommendation': {
      const d = entity.data;
      summary = `Operational recommendation: ${d.title || d.recommendation_type || 'unknown'}`;
      factors.push(
        { factor: 'priority_score', value: d.priority_score, impact: 'Determines review queue position' },
        { factor: 'confidence_score', value: d.confidence_score, impact: 'Confidence in recommendation validity' },
        { factor: 'expected_impact', value: d.expected_impact_score, impact: 'Projected operational impact' },
        { factor: 'arch_alignment', value: d.architecture_alignment_score, impact: 'Architecture fit affects feasibility' },
        { factor: 'profile_alignment', value: d.profile_alignment_score, impact: 'Profile fit affects applicability' },
      );
      if (d.confidence_score < 0.5) limitations.push('Below confidence threshold — treat as exploratory');
      break;
    }
    case 'correlation': {
      const d = entity.data;
      summary = `${d.correlation_type || 'Product'} correlation for ${d.product_area || 'unknown area'}`;
      factors.push(
        { factor: 'correlation_strength', value: d.correlation_strength, impact: 'Strength of product-architecture link' },
        { factor: 'confidence', value: d.confidence_score, impact: 'Data sufficiency for correlation' },
      );
      if (d.limitations) limitations.push(d.limitations);
      break;
    }
    default:
      summary = `Entity of type ${entity.type}`;
      limitations.push('No specific explainability template for this entity type');
  }

  return { entityType: entity.type, summary, factors, limitations };
}
