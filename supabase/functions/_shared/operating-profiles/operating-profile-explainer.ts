/**
 * Operating Profile Explainer
 * Generates structured explanations for profile recommendations, pack composition, or overrides.
 */

export interface ProfileExplanation {
  profileId: string;
  profileName: string;
  fitExplanation: string;
  biasProfile: string;
  governancePosture: string;
  rollbackAssessment: string;
  overrideBudget: string;
  caveats: string[];
  recommendedAction: string;
}

export function explainProfile(profile: Record<string, any>): ProfileExplanation {
  const caveats: string[] = [];

  // Fit explanation
  const fitExplanation = profile.tenant_fit_score >= 0.7
    ? 'Strong tenant fit — well-aligned with scope requirements'
    : profile.tenant_fit_score >= 0.4
      ? 'Moderate fit — some adjustments may be needed'
      : 'Weak fit — consider alternatives or significant overrides';

  // Bias profile
  const biases: string[] = [];
  if (profile.stability_bias_score >= 0.7) biases.push('stability-oriented');
  if (profile.cost_bias_score >= 0.7) biases.push('cost-conscious');
  if (profile.speed_bias_score >= 0.7) biases.push('speed-optimized');
  if (profile.governance_strictness_score >= 0.7) biases.push('governance-strict');
  const biasProfile = biases.length > 0 ? biases.join(', ') : 'balanced';

  // Governance posture
  const governancePosture = profile.governance_strictness_score >= 0.7
    ? 'Strict governance — minimal override budget, high review requirements'
    : profile.governance_strictness_score >= 0.4
      ? 'Moderate governance — balanced override budget'
      : 'Permissive governance — high override budget, fewer review gates';

  // Rollback assessment
  const rollbackAssessment = profile.rollback_viability_score >= 0.7
    ? 'Easy rollback — low complexity, well-bounded'
    : profile.rollback_viability_score >= 0.4
      ? 'Moderate rollback complexity'
      : 'Difficult rollback — plan carefully before adoption';

  // Override budget
  const overrideBudget = profile.override_budget_score >= 0.7
    ? 'Large override budget — local adjustments allowed'
    : profile.override_budget_score >= 0.4
      ? 'Moderate override budget'
      : 'Tight override budget — limited local adjustments';

  // Caveats
  if (profile.profile_drift_score >= 0.5) caveats.push('Profile drift detected — review for staleness');
  if (profile.rollback_viability_score < 0.4) caveats.push('Low rollback viability — ensure backup plan');
  if (profile.tenant_fit_score < 0.4) caveats.push('Low tenant fit — may cause friction');
  if (profile.shared_reuse_score < 0.3) caveats.push('Low reuse evidence — less proven in practice');

  // Recommended action
  let recommendedAction = 'Review for potential adoption';
  if (profile.adoption_status === 'active') recommendedAction = 'Currently active — monitor for drift';
  else if (profile.tenant_fit_score >= 0.7 && profile.rollback_viability_score >= 0.6) recommendedAction = 'Strong candidate for adoption review';
  else if (profile.tenant_fit_score < 0.4) recommendedAction = 'Consider alternatives before adoption';

  return {
    profileId: profile.id,
    profileName: profile.profile_name,
    fitExplanation,
    biasProfile,
    governancePosture,
    rollbackAssessment,
    overrideBudget,
    caveats,
    recommendedAction,
  };
}
