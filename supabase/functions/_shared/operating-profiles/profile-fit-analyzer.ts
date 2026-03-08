/**
 * Profile Fit Analyzer
 * Scores profile fit for an organization, workspace, initiative, or architecture mode.
 */

export interface FitContext {
  scopeType: string;
  scopeId?: string;
  architectureMode?: string;
  tenantPreferences?: Record<string, unknown>;
  currentStabilityLevel?: number;
  currentCostLevel?: number;
}

export interface ProfileForFit {
  id: string;
  profile_name: string;
  scope_type: string;
  tenant_fit_score: number;
  stability_bias_score: number;
  cost_bias_score: number;
  speed_bias_score: number;
  governance_strictness_score: number;
  rollback_viability_score: number;
  architecture_mode_compatibility: Record<string, unknown>;
}

export interface FitResult {
  profileId: string;
  profileName: string;
  fitScore: number;
  stabilityAlignment: number;
  costAlignment: number;
  modeCompatibility: boolean;
  recommendation: string;
}

export function analyzeProfileFit(profile: ProfileForFit, context: FitContext): FitResult {
  let fitScore = profile.tenant_fit_score * 0.3;

  // Scope alignment
  if (profile.scope_type === context.scopeType) fitScore += 0.2;
  else if (profile.scope_type === 'organization' && context.scopeType === 'workspace') fitScore += 0.1;

  // Architecture mode compatibility
  const modeCompatible = !context.architectureMode ||
    !profile.architecture_mode_compatibility ||
    Object.keys(profile.architecture_mode_compatibility).length === 0 ||
    (profile.architecture_mode_compatibility as any)[context.architectureMode] !== false;
  if (modeCompatible) fitScore += 0.15;

  // Stability alignment
  const stabilityAlignment = context.currentStabilityLevel != null
    ? 1 - Math.abs(profile.stability_bias_score - context.currentStabilityLevel)
    : 0.5;
  fitScore += stabilityAlignment * 0.15;

  // Cost alignment
  const costAlignment = context.currentCostLevel != null
    ? 1 - Math.abs(profile.cost_bias_score - context.currentCostLevel)
    : 0.5;
  fitScore += costAlignment * 0.1;

  // Rollback safety bonus
  fitScore += profile.rollback_viability_score * 0.1;

  fitScore = Math.round(Math.min(1, fitScore) * 100) / 100;

  let recommendation = 'Neutral fit';
  if (fitScore >= 0.7) recommendation = 'Strong fit — recommended for adoption review';
  else if (fitScore >= 0.5) recommendation = 'Moderate fit — review with context-specific adjustments';
  else recommendation = 'Weak fit — consider alternative profiles or local overrides';

  return {
    profileId: profile.id,
    profileName: profile.profile_name,
    fitScore,
    stabilityAlignment: Math.round(stabilityAlignment * 100) / 100,
    costAlignment: Math.round(costAlignment * 100) / 100,
    modeCompatibility: modeCompatible,
    recommendation,
  };
}
