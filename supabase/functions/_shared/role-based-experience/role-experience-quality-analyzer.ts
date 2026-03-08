// Role Experience Quality Analyzer
// Evaluates whether each role surface is appropriately clear and bounded.

import { RoleName } from "./role-experience-model-manager.ts";
import { computeLeakageScore } from "./complexity-leakage-detector.ts";
import { computeInformationSummarizationScore } from "./role-information-layer-manager.ts";
import { computeApprovalVisibilityScore } from "./approval-visibility-router.ts";
import { getNavigationForRole } from "./role-navigation-orchestrator.ts";

export interface RoleQualityMetrics {
  role_experience_quality_score: number;
  navigation_clarity_score: number;
  complexity_exposure_score: number;
  internal_complexity_leakage_score: number;
  approval_visibility_score: number;
  information_summarization_score: number;
  operator_surface_effectiveness_score: number;
  default_user_journey_clarity_score: number;
  admin_surface_integrity_score: number;
  permission_alignment_score: number;
  role_friction_score: number;
  bounded_visibility_coherence_score: number;
  role_surface_separation_score: number;
}

export function computeQualityMetrics(roleName: RoleName, exposedSurfaces: string[]): RoleQualityMetrics {
  const nav = getNavigationForRole(roleName);
  const totalNavItems = nav.main.length + nav.bottom.length;

  const leakageScore = computeLeakageScore(roleName, exposedSurfaces);
  const infoScore = computeInformationSummarizationScore(roleName);
  const approvalScore = computeApprovalVisibilityScore(roleName);

  // Navigation clarity: fewer items = clearer for default user
  const navClarity = roleName === "default_user"
    ? Math.max(0, 1 - (totalNavItems / 20))
    : roleName === "operator"
      ? Math.max(0, 1 - (totalNavItems / 25))
      : 0.8; // admin needs density

  // Complexity exposure: how much internal complexity is visible
  const complexityExposure = roleName === "default_user" ? 0.1 : roleName === "operator" ? 0.4 : 0.9;

  // Friction: penalized by leakage and low clarity
  const friction = Math.min(1, leakageScore * 0.6 + (1 - navClarity) * 0.4);

  // Role-specific scores
  const defaultUserClarity = roleName === "default_user" ? Math.max(0, 1 - leakageScore) * navClarity : 0.5;
  const operatorEffectiveness = roleName === "operator" ? Math.max(0, approvalScore * 0.5 + infoScore * 0.5) : 0.5;
  const adminIntegrity = roleName === "admin" ? 0.9 : 0.5; // admin always has full access

  // Overall quality
  const quality = Math.max(0, Math.min(1,
    navClarity * 0.2 +
    (1 - leakageScore) * 0.25 +
    approvalScore * 0.15 +
    infoScore * 0.15 +
    (1 - friction) * 0.15 +
    0.1 // base
  ));

  return {
    role_experience_quality_score: Number(quality.toFixed(3)),
    navigation_clarity_score: Number(navClarity.toFixed(3)),
    complexity_exposure_score: Number(complexityExposure.toFixed(3)),
    internal_complexity_leakage_score: Number(leakageScore.toFixed(3)),
    approval_visibility_score: Number(approvalScore.toFixed(3)),
    information_summarization_score: Number(infoScore.toFixed(3)),
    operator_surface_effectiveness_score: Number(operatorEffectiveness.toFixed(3)),
    default_user_journey_clarity_score: Number(defaultUserClarity.toFixed(3)),
    admin_surface_integrity_score: Number(adminIntegrity.toFixed(3)),
    permission_alignment_score: Number((1 - leakageScore).toFixed(3)),
    role_friction_score: Number(friction.toFixed(3)),
    bounded_visibility_coherence_score: Number((infoScore * 0.5 + navClarity * 0.5).toFixed(3)),
    role_surface_separation_score: Number((1 - leakageScore).toFixed(3)),
  };
}
