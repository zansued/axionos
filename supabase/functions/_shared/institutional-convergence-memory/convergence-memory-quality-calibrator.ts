/**
 * Convergence Memory Quality Calibrator
 * Bounds confidence and penalizes weak or outdated memory.
 */

export interface QualityInput {
  evidenceDensityScore: number;
  reuseConfidenceScore: number;
  memoryQualityScore: number;
  feedbackUsefulnessRate: number;
  feedbackCount: number;
  ageInDays: number;
  contradictionCount: number;
}

export interface CalibratedQuality {
  adjustedQuality: number;
  adjustedConfidence: number;
  stalePenalty: number;
  contradictionPenalty: number;
  feedbackAdjustment: number;
  calibrationExplanation: string;
}

export function calibrateQuality(input: QualityInput): CalibratedQuality {
  let adjustedQuality = input.memoryQualityScore;
  let adjustedConfidence = input.reuseConfidenceScore;
  const explanations: string[] = [];

  // Stale penalty: decay after 120 days
  let stalePenalty = 0;
  if (input.ageInDays > 120) {
    stalePenalty = Math.min((input.ageInDays - 120) / 365, 0.4);
    adjustedQuality -= stalePenalty;
    adjustedConfidence -= stalePenalty * 0.5;
    explanations.push(`Stale penalty: -${(stalePenalty * 100).toFixed(0)}% (${input.ageInDays} days old)`);
  }

  // Contradiction penalty
  let contradictionPenalty = 0;
  if (input.contradictionCount > 0) {
    contradictionPenalty = Math.min(input.contradictionCount * 0.15, 0.5);
    adjustedQuality -= contradictionPenalty;
    adjustedConfidence -= contradictionPenalty;
    explanations.push(`Contradiction penalty: -${(contradictionPenalty * 100).toFixed(0)}% (${input.contradictionCount} contradictions)`);
  }

  // Feedback adjustment
  let feedbackAdjustment = 0;
  if (input.feedbackCount >= 3) {
    if (input.feedbackUsefulnessRate > 0.7) {
      feedbackAdjustment = 0.1;
      adjustedQuality += feedbackAdjustment;
      explanations.push(`Feedback boost: +10% (${(input.feedbackUsefulnessRate * 100).toFixed(0)}% useful)`);
    } else if (input.feedbackUsefulnessRate < 0.3) {
      feedbackAdjustment = -0.2;
      adjustedQuality += feedbackAdjustment;
      adjustedConfidence -= 0.15;
      explanations.push(`Feedback penalty: -20% (${(input.feedbackUsefulnessRate * 100).toFixed(0)}% useful)`);
    }
  }

  // Low evidence penalty
  if (input.evidenceDensityScore < 0.2) {
    adjustedConfidence -= 0.15;
    explanations.push('Low evidence density: confidence reduced');
  }

  // Bound values
  adjustedQuality = Math.round(Math.max(0, Math.min(1, adjustedQuality)) * 100) / 100;
  adjustedConfidence = Math.round(Math.max(0, Math.min(1, adjustedConfidence)) * 100) / 100;

  return {
    adjustedQuality,
    adjustedConfidence,
    stalePenalty: Math.round(stalePenalty * 100) / 100,
    contradictionPenalty: Math.round(contradictionPenalty * 100) / 100,
    feedbackAdjustment: Math.round(feedbackAdjustment * 100) / 100,
    calibrationExplanation: explanations.length > 0 ? explanations.join('; ') : 'No adjustments needed',
  };
}
