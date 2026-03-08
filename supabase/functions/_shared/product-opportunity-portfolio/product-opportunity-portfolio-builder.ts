/**
 * Product Opportunity Portfolio Builder — Sprint 55
 * Builds and maintains product opportunity portfolios from product intelligence outputs.
 */

export interface PortfolioBuilderInput {
  organization_id: string;
  workspace_id?: string;
  portfolio_name: string;
  portfolio_scope_type: string;
  portfolio_scope_id?: string;
  source_recommendations: SourceRecommendation[];
}

export interface SourceRecommendation {
  recommendation_id: string;
  benchmark_id?: string;
  architecture_correlation_id?: string;
  profile_correlation_id?: string;
  product_area?: string;
  adoption_score: number;
  retention_score: number;
  friction_score: number;
  value_score: number;
  confidence_score: number;
  evidence_links: any[];
}

export interface PortfolioItem {
  opportunity_ref: any;
  linked_benchmark_id?: string;
  linked_recommendation_id?: string;
  linked_architecture_correlation_id?: string;
  linked_profile_correlation_id?: string;
  strategic_fit_score: number;
  expected_value_score: number;
  confidence_score: number;
  feasibility_score: number;
  governance_state: string;
  evidence_links: any[];
  rationale: string[];
}

export function buildPortfolioItems(input: PortfolioBuilderInput): PortfolioItem[] {
  return input.source_recommendations.map(rec => {
    const expected_value_score = round(
      rec.value_score * 0.4 + rec.adoption_score * 0.3 + rec.retention_score * 0.3
    );
    const feasibility_score = round(
      1 - rec.friction_score * 0.6 + rec.confidence_score * 0.4
    );
    const strategic_fit_score = round(
      rec.confidence_score * 0.5 + rec.value_score * 0.3 + rec.adoption_score * 0.2
    );

    const rationale: string[] = [];
    if (rec.value_score > 0.7) rationale.push("High product value signal");
    if (rec.friction_score > 0.6) rationale.push("Significant friction detected");
    if (rec.confidence_score < 0.4) rationale.push("Low confidence — requires more evidence");
    if (rationale.length === 0) rationale.push("Within standard thresholds");

    return {
      opportunity_ref: {
        recommendation_id: rec.recommendation_id,
        product_area: rec.product_area,
      },
      linked_benchmark_id: rec.benchmark_id,
      linked_recommendation_id: rec.recommendation_id,
      linked_architecture_correlation_id: rec.architecture_correlation_id,
      linked_profile_correlation_id: rec.profile_correlation_id,
      strategic_fit_score,
      expected_value_score,
      confidence_score: rec.confidence_score,
      feasibility_score: Math.max(0, Math.min(1, feasibility_score)),
      governance_state: "candidate",
      evidence_links: rec.evidence_links || [],
      rationale,
    };
  });
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
