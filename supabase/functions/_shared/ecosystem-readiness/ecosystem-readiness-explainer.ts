/**
 * Ecosystem Readiness Explainer — Sprint 56
 * Returns structured explanations for readiness scores, exposure classification, and trust assumptions.
 */

export interface ExplainRequest {
  explain_type: 'readiness_score' | 'exposure_classification' | 'trust_model' | 'safety_prerequisites' | 'risk_assessment' | 'recommendation';
  context: Record<string, unknown>;
}

export interface ExplainResult {
  explain_type: string;
  summary: string;
  factors: ExplainFactor[];
  limitations: string[];
}

export interface ExplainFactor {
  factor_name: string;
  factor_value: number | string;
  contribution: string;
  direction: 'positive' | 'negative' | 'neutral';
}

export function explainReadiness(request: ExplainRequest): ExplainResult {
  const factors: ExplainFactor[] = [];
  const limitations: string[] = ['all_assessments_are_advisory_only', 'no_ecosystem_activation_in_sprint_56'];

  switch (request.explain_type) {
    case 'readiness_score': {
      const ctx = request.context as Record<string, number>;
      factors.push({ factor_name: 'safety_prerequisite_score', factor_value: ctx.safety_prerequisite_score || 0, contribution: '30% weight', direction: (ctx.safety_prerequisite_score || 0) >= 0.5 ? 'positive' : 'negative' });
      factors.push({ factor_name: 'policy_readiness_score', factor_value: ctx.policy_readiness_score || 0, contribution: '20% weight', direction: (ctx.policy_readiness_score || 0) >= 0.5 ? 'positive' : 'negative' });
      factors.push({ factor_name: 'trust_requirement_score', factor_value: ctx.trust_requirement_score || 0, contribution: '20% weight', direction: (ctx.trust_requirement_score || 0) >= 0.5 ? 'positive' : 'negative' });
      factors.push({ factor_name: 'auditability_score', factor_value: ctx.auditability_score || 0, contribution: '15% weight', direction: (ctx.auditability_score || 0) >= 0.5 ? 'positive' : 'negative' });
      factors.push({ factor_name: 'blast_radius_readiness_score', factor_value: ctx.blast_radius_readiness_score || 0, contribution: '15% weight', direction: (ctx.blast_radius_readiness_score || 0) >= 0.5 ? 'positive' : 'negative' });
      return { explain_type: request.explain_type, summary: 'Readiness score is a weighted composite of safety, policy, trust, auditability, and blast radius readiness, penalized by criticality and dependency sensitivity.', factors, limitations };
    }
    case 'exposure_classification':
      return { explain_type: request.explain_type, summary: 'Exposure classification is determined by criticality thresholds, dependency sensitivity, auditability levels, and unmet prerequisites.', factors: [{ factor_name: 'classification_logic', factor_value: 'threshold-based', contribution: 'deterministic', direction: 'neutral' }], limitations };
    case 'trust_model':
      return { explain_type: request.explain_type, summary: 'Trust model confidence combines governance coverage, isolation strength, and auditability, penalized by identified trust gaps.', factors, limitations };
    case 'recommendation':
      return { explain_type: request.explain_type, summary: 'Recommendations are advisory-first. Critical risk → never_expose, many unmet prerequisites → delay, low readiness → reassess_later, otherwise → prepare.', factors, limitations };
    default:
      return { explain_type: request.explain_type, summary: 'Ecosystem readiness assessments are bounded, advisory-first, and human-reviewed.', factors, limitations };
  }
}
