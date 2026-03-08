/**
 * Profile Governance Calibrator
 * Enforces confidence bounds, adoption limits, and review requirements.
 */

export interface CalibrationInput {
  adoptionConfidence: number;
  tenantFitScore: number;
  rollbackViability: number;
  profileDrift: number;
  overridePressure: number;
  activeBindings: number;
}

export interface CalibrationResult {
  adoptionAllowed: boolean;
  reviewRequired: boolean;
  driftAlert: boolean;
  overridePressureAlert: boolean;
  reasons: string[];
  adjustedConfidence: number;
}

export function calibrateProfileGovernance(input: CalibrationInput): CalibrationResult {
  const reasons: string[] = [];
  let adjustedConfidence = input.adoptionConfidence;
  let reviewRequired = false;
  let adoptionAllowed = true;

  // Drift alert
  const driftAlert = input.profileDrift >= 0.5;
  if (driftAlert) {
    adjustedConfidence -= 0.15;
    reviewRequired = true;
    reasons.push(`Profile drift at ${(input.profileDrift * 100).toFixed(0)}% — review recommended`);
  }

  // Override pressure alert
  const overridePressureAlert = input.overridePressure >= 0.7;
  if (overridePressureAlert) {
    reasons.push(`Override pressure at ${(input.overridePressure * 100).toFixed(0)}% — consider profile revision`);
  }

  // Low fit
  if (input.tenantFitScore < 0.4) {
    adjustedConfidence -= 0.2;
    reviewRequired = true;
    reasons.push('Low tenant fit — adoption requires review');
  }

  // Low rollback viability
  if (input.rollbackViability < 0.4) {
    adjustedConfidence -= 0.1;
    reviewRequired = true;
    reasons.push('Low rollback viability — ensure rollback plan before adoption');
  }

  // Binding count check
  if (input.activeBindings >= 10) {
    reviewRequired = true;
    reasons.push('High binding count — wide adoption needs governance review');
  }

  // Block if too low
  if (adjustedConfidence < 0.2) {
    adoptionAllowed = false;
    reasons.push('Confidence too low — adoption blocked pending review');
  }

  adjustedConfidence = Math.round(Math.max(0, Math.min(1, adjustedConfidence)) * 100) / 100;

  return {
    adoptionAllowed,
    reviewRequired,
    driftAlert,
    overridePressureAlert,
    reasons,
    adjustedConfidence,
  };
}
