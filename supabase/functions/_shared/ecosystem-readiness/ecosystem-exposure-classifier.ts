/**
 * Ecosystem Exposure Classifier — Sprint 56
 * Classifies capabilities into exposure candidates, restricted, internal-only, or never-expose groups.
 */

export interface ClassificationInput {
  capability_name: string;
  internal_criticality_score: number;
  dependency_sensitivity_score: number;
  externalization_risk_score: number;
  auditability_score: number;
  has_governance_coverage: boolean;
  has_observability_coverage: boolean;
}

export interface ClassificationResult {
  capability_name: string;
  exposure_class: 'candidate' | 'restricted' | 'internal_only' | 'never_expose';
  exposure_restriction_score: number;
  classification_reasons: string[];
  missing_prerequisites: string[];
}

export function classifyExposureReadiness(inputs: ClassificationInput[]): ClassificationResult[] {
  return inputs.map(input => {
    const reasons: string[] = [];
    const missing: string[] = [];
    let restrictionScore = 0;

    // Never expose: extremely critical systems
    if (input.internal_criticality_score > 0.9) {
      reasons.push('core_system_critical');
      return { capability_name: input.capability_name, exposure_class: 'never_expose' as const, exposure_restriction_score: 1, classification_reasons: reasons, missing_prerequisites: [] };
    }

    // Check prerequisites
    if (!input.has_governance_coverage) { missing.push('governance_coverage'); restrictionScore += 0.3; }
    if (!input.has_observability_coverage) { missing.push('observability_coverage'); restrictionScore += 0.2; }
    if (input.auditability_score < 0.5) { missing.push('adequate_auditability'); restrictionScore += 0.2; }

    restrictionScore += input.externalization_risk_score * 0.3;

    if (input.dependency_sensitivity_score > 0.8) {
      reasons.push('high_dependency_sensitivity');
      return { capability_name: input.capability_name, exposure_class: 'internal_only' as const, exposure_restriction_score: Math.min(1, restrictionScore + 0.3), classification_reasons: reasons, missing_prerequisites: missing };
    }

    if (restrictionScore > 0.5 || missing.length > 1) {
      reasons.push('unmet_prerequisites_or_high_risk');
      return { capability_name: input.capability_name, exposure_class: 'restricted' as const, exposure_restriction_score: Math.min(1, restrictionScore), classification_reasons: reasons, missing_prerequisites: missing };
    }

    reasons.push('meets_exposure_candidate_criteria');
    return { capability_name: input.capability_name, exposure_class: 'candidate' as const, exposure_restriction_score: Math.round(restrictionScore * 10000) / 10000, classification_reasons: reasons, missing_prerequisites: missing };
  });
}
