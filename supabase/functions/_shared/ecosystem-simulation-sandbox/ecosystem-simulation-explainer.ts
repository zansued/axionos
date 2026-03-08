/**
 * Ecosystem Simulation Explainer — Sprint 59
 * Returns structured explanations for simulation results, policy conflicts, blast radius, and readiness.
 */

export function explainEcosystemSimulation() {
  return {
    explanation: 'Ecosystem Simulation & Sandbox is a governed, advisory-first environment that simulates future ecosystem interactions without activating live participation. All results are advisory and require human review.',
    scenario_statuses: ['draft', 'ready', 'running', 'completed', 'failed', 'archived'],
    run_statuses: ['pending', 'running', 'completed', 'failed'],
    recommendation_types: ['simulate_more', 'delay', 'restrict', 'reject_path', 'future_pilot_candidate'],
    metrics: [
      'simulation_readiness_score', 'sandbox_safety_score', 'policy_conflict_score',
      'trust_failure_score', 'blast_radius_score', 'rollback_viability_score',
      'activation_readiness_signal', 'scenario_confidence_score', 'restriction_violation_score',
      'containment_quality_score', 'simulated_participation_viability_score',
      'recommendation_quality_score', 'simulation_outcome_accuracy_score',
      'false_positive_activation_risk_score',
    ],
    safety_constraints: [
      'Simulation-only — no live ecosystem activation',
      'No real external capability access',
      'No autonomous partner enablement',
      'Advisory-first — all results require human review',
      'Tenant isolation enforced via RLS',
    ],
  };
}
