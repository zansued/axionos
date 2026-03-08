/**
 * Capability Exposure Governance Explainer — Sprint 57
 * Returns structured explanations for classes, gates, restrictions, and recommendations.
 */

export interface ExplainRequest {
  explain_type: 'exposure_class' | 'gate_evaluation' | 'restriction' | 'recommendation' | 'governance_score' | 'overview';
  context: Record<string, unknown>;
}

export interface ExplainResult {
  explain_type: string;
  summary: string;
  factors: { name: string; value: number | string; contribution: string; direction: 'positive' | 'negative' | 'neutral' }[];
  limitations: string[];
}

export function explainGovernance(request: ExplainRequest): ExplainResult {
  const limitations = [
    'all_governance_outputs_are_advisory_only',
    'no_external_exposure_activated_in_sprint_57',
    'human_review_required_for_all_decisions',
  ];

  switch (request.explain_type) {
    case 'exposure_class':
      return {
        explain_type: request.explain_type,
        summary: 'Exposure classes are determined by criticality, dependency sensitivity, gate scores, and readiness levels. Classes range from never_expose to controlled_future_candidate.',
        factors: [
          { name: 'criticality_threshold', value: '>0.9 → never_expose', contribution: 'primary', direction: 'negative' },
          { name: 'dependency_threshold', value: '>0.85 → internal_only', contribution: 'primary', direction: 'negative' },
          { name: 'gate_minimum', value: '<0.3 → internal_only', contribution: 'secondary', direction: 'negative' },
        ],
        limitations,
      };
    case 'gate_evaluation':
      return {
        explain_type: request.explain_type,
        summary: 'Gates evaluate safety (30%), trust (25%), policy (25%), and auditability (20%). All gates must pass threshold (0.5) for exposure candidacy.',
        factors: [
          { name: 'safety_gate', value: '30% weight', contribution: 'highest', direction: 'neutral' },
          { name: 'trust_gate', value: '25% weight', contribution: 'high', direction: 'neutral' },
          { name: 'policy_gate', value: '25% weight', contribution: 'high', direction: 'neutral' },
          { name: 'auditability_gate', value: '20% weight', contribution: 'standard', direction: 'neutral' },
        ],
        limitations,
      };
    case 'restriction':
      return {
        explain_type: request.explain_type,
        summary: 'Restrictions are applied based on criticality, sensitive data access, dependency sensitivity, and governance coverage. Hard restrictions cannot be overridden.',
        factors: [],
        limitations,
      };
    case 'recommendation':
      return {
        explain_type: request.explain_type,
        summary: 'Recommendations follow: hard restriction → restrict, high risk → reject, low governance → delay, sandbox level → sandbox_only, threshold met → future_candidate. All require human review.',
        factors: [],
        limitations,
      };
    default:
      return {
        explain_type: request.explain_type,
        summary: 'Capability exposure governance is bounded, advisory-first, and requires human review. No external activation occurs in Sprint 57.',
        factors: [],
        limitations,
      };
  }
}
