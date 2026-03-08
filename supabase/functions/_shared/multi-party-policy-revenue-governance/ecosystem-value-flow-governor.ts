/**
 * Ecosystem Value Flow Governor — Sprint 62
 * Governs bounded value-flow and revenue-rule logic across participant relationships.
 */

export interface ValueFlowInput {
  value_flow_type: string;
  revenue_rule_type: string;
  revenue_bound_score: number;
  settlement_readiness_score: number;
}

export interface ValueFlowResult {
  value_flow_governance_score: number;
  revenue_bound_score: number;
  settlement_readiness: string;
  rationale: string[];
}

export function governValueFlow(input: ValueFlowInput): ValueFlowResult {
  const rationale: string[] = [];
  let governance = input.revenue_bound_score * 0.5 + input.settlement_readiness_score * 0.5;

  if (input.revenue_bound_score < 0.3) { governance *= 0.4; rationale.push('low_revenue_boundedness'); }
  if (input.settlement_readiness_score < 0.3) { rationale.push('not_settlement_ready'); }
  if (input.revenue_rule_type === 'unbounded') { governance = 0; rationale.push('unbounded_revenue_blocked'); }

  const readiness = governance >= 0.6 ? 'ready' : governance >= 0.3 ? 'needs_review' : 'not_ready';

  return {
    value_flow_governance_score: Math.round(Math.min(1, governance) * 10000) / 10000,
    revenue_bound_score: Math.round(input.revenue_bound_score * 10000) / 10000,
    settlement_readiness: readiness,
    rationale,
  };
}
