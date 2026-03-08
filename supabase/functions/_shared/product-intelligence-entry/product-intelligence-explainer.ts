/**
 * Product Intelligence Explainer
 * Generates structured explanations for product-informed rankings and recommendations.
 */

export interface ExplanationInput {
  type: 'signal' | 'friction' | 'opportunity' | 'segmentation';
  data: Record<string, any>;
}

export interface StructuredExplanation {
  type: string;
  summary: string;
  factors: string[];
  caveats: string[];
  recommendedAction: string;
}

export function explainProductIntelligence(input: ExplanationInput): StructuredExplanation {
  const factors: string[] = [];
  const caveats: string[] = [];

  switch (input.type) {
    case 'signal': return explainSignal(input.data, factors, caveats);
    case 'friction': return explainFriction(input.data, factors, caveats);
    case 'opportunity': return explainOpportunity(input.data, factors, caveats);
    case 'segmentation': return explainSegmentation(input.data, factors, caveats);
    default: return { type: input.type, summary: 'Unknown type', factors: [], caveats: [], recommendedAction: 'Review manually' };
  }
}

function explainSignal(d: any, factors: string[], caveats: string[]): StructuredExplanation {
  if (d.signal_quality_score >= 0.7) factors.push('High quality signal with strong evidence');
  else if (d.signal_quality_score >= 0.4) factors.push('Moderate quality signal');
  else { factors.push('Low quality signal'); caveats.push('Low quality — treat with caution'); }
  if (d.noise_penalty_score >= 0.5) caveats.push('High noise penalty — signal may be unreliable');
  if (d.confidence_score < 0.4) caveats.push('Low confidence — insufficient evidence');

  return {
    type: 'signal',
    summary: `${d.signal_type} signal from ${d.signal_source} in ${d.product_area || 'unknown area'}`,
    factors, caveats,
    recommendedAction: d.signal_quality_score >= 0.6 ? 'Include in product analysis' : 'Monitor for recurrence before acting',
  };
}

function explainFriction(d: any, factors: string[], caveats: string[]): StructuredExplanation {
  factors.push(`Severity: ${(d.severity_score * 100).toFixed(0)}%`);
  factors.push(`Recurrence: ${d.recurrence_count} signals`);
  if (d.architecture_correlation_score >= 0.5) factors.push('Correlated with architecture constraints');
  if (d.profile_correlation_score >= 0.5) factors.push('Correlated with operating profile gaps');
  if (d.trend_direction === 'worsening') caveats.push('Trend is worsening — prioritize review');

  return {
    type: 'friction',
    summary: `${d.friction_type} friction cluster in ${d.product_area} (${d.trend_direction})`,
    factors, caveats,
    recommendedAction: d.severity_score >= 0.6 ? 'Review for root cause and resolution' : 'Monitor trend',
  };
}

function explainOpportunity(d: any, factors: string[], caveats: string[]): StructuredExplanation {
  factors.push(`Opportunity score: ${(d.opportunity_score * 100).toFixed(0)}%`);
  factors.push(`Confidence: ${(d.confidence_score * 100).toFixed(0)}%`);
  factors.push(`Architecture alignment: ${(d.architecture_alignment_score * 100).toFixed(0)}%`);
  if (d.feasibility_score >= 0.7) factors.push('High feasibility');
  if (d.confidence_score < 0.4) caveats.push('Low confidence — more evidence needed');
  if (d.architecture_alignment_score < 0.4) caveats.push('Poor architecture alignment — implementation risk');

  return {
    type: 'opportunity',
    summary: `${d.opportunity_type} opportunity in ${d.product_area}`,
    factors, caveats,
    recommendedAction: d.priority_score >= 0.6 ? 'Recommend for human review' : 'Gather more evidence before prioritizing',
  };
}

function explainSegmentation(d: any, factors: string[], caveats: string[]): StructuredExplanation {
  factors.push(`Divergence: ${(d.divergence_score * 100).toFixed(0)}%`);
  factors.push(`Type: ${d.divergence_type}`);
  if (d.divergence_score >= 0.5) caveats.push('Significant divergence — does not automatically imply fragmentation');

  return {
    type: 'segmentation',
    summary: `${d.divergence_type} divergence in ${d.product_area} for ${d.scope_type}:${d.scope_id}`,
    factors, caveats,
    recommendedAction: d.divergence_score >= 0.5 ? 'Review for bounded specialization' : 'Monitor',
  };
}
