/**
 * Multi-Party Governance Explainer — Sprint 62
 * Returns structured explanations for multi-party policy and revenue governance.
 */

export function explainMultiPartyGovernance() {
  return {
    explanation: 'Multi-Party Policy & Revenue Governance manages interaction policies, entitlements, obligations, value flows, and conflict resolution across bounded ecosystem participants. This is controlled activation, not unrestricted commerce.',
    party_roles: ['provider', 'consumer', 'operator', 'host', 'restricted_participant'],
    interaction_types: ['capability_access', 'data_exchange', 'value_transfer', 'service_provision', 'collaborative_execution'],
    value_flow_types: ['usage_based', 'subscription', 'revenue_share', 'flat_fee', 'bounded_pilot'],
    metrics: [
      'multi_party_governance_score', 'policy_alignment_score', 'entitlement_integrity_score',
      'restriction_level_score', 'fairness_score', 'enforceability_score', 'conflict_score',
      'value_flow_governance_score', 'revenue_bound_score', 'settlement_readiness_score',
      'multi_party_risk_score', 'recommendation_quality_score', 'governance_outcome_accuracy_score',
      'bounded_commercial_integrity_score',
    ],
    safety_constraints: [
      'Policy-bounded — no unrestricted marketplace',
      'No autonomous agreement approval',
      'No autonomous value-flow expansion',
      'No irreversible financial obligations',
      'Tenant isolation enforced via RLS',
    ],
  };
}
