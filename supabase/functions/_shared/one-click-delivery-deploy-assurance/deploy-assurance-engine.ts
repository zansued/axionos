// Deploy Assurance Engine
// Computes deploy confidence, blocker posture, rollback readiness, and assurance quality.

import { DeliveryReadinessResult } from "./delivery-readiness-evaluator.ts";

export interface DeployAssuranceResult {
  deploy_confidence_score: number;
  rollback_readiness_score: number;
  recovery_readiness_score: number;
  one_click_friction_score: number;
  deploy_success_clarity_score: number;
  delivery_assurance_quality_score: number;
  final_mile_coherence_score: number;
  degraded_delivery_visibility_score: number;
  delivery_outcome_accuracy_score: number;
  confidence_label: string;
  confidence_rationale: string;
}

export function computeDeployAssurance(
  readiness: DeliveryReadinessResult,
  hasDeployUrl: boolean,
  hasRepoUrl: boolean,
  hasPreviewUrl: boolean,
  rollbackAvailable: boolean,
): DeployAssuranceResult {
  const { deploy_readiness_score, blocker_score, validation_gate_score } = readiness;

  // Confidence = readiness weighted + validation weighted - blocker penalty
  const confidence = Math.max(0, Math.min(1,
    deploy_readiness_score * 0.4 +
    validation_gate_score * 0.3 +
    (1 - blocker_score) * 0.3
  ));

  // Rollback readiness
  const rollbackReadiness = rollbackAvailable ? 0.8 : 0.2;

  // Recovery readiness
  const recoveryReadiness = rollbackAvailable ? 0.7 : hasRepoUrl ? 0.4 : 0.1;

  // Friction: gap between "one-click" promise and actual readiness
  const friction = Math.min(1, blocker_score * 0.5 + (1 - confidence) * 0.3 + (!readiness.is_ready ? 0.2 : 0));

  // Deploy success clarity
  const successClarity = hasDeployUrl ? 0.9 : hasRepoUrl ? 0.5 : 0.1;

  // Delivery visibility
  const deliveryVisibility = (hasDeployUrl ? 0.4 : 0) + (hasRepoUrl ? 0.3 : 0) + (hasPreviewUrl ? 0.2 : 0) + (rollbackAvailable ? 0.1 : 0);

  // Output accessibility
  const outputAccessibility = (hasDeployUrl ? 0.5 : 0) + (hasPreviewUrl ? 0.3 : 0) + (hasRepoUrl ? 0.2 : 0);

  // Assurance quality: composite
  const assuranceQuality = Math.max(0, Math.min(1,
    confidence * 0.3 + (1 - friction) * 0.2 + successClarity * 0.2 + rollbackReadiness * 0.15 + deliveryVisibility * 0.15
  ));

  // Final mile coherence
  const finalMile = Math.max(0, Math.min(1,
    assuranceQuality * 0.4 + successClarity * 0.3 + deliveryVisibility * 0.3
  ));

  // Degraded delivery visibility
  const degradedVisibility = hasDeployUrl ? 0 : hasRepoUrl ? 0.5 : 1.0;

  return {
    deploy_confidence_score: Number(confidence.toFixed(3)),
    rollback_readiness_score: Number(rollbackReadiness.toFixed(3)),
    recovery_readiness_score: Number(recoveryReadiness.toFixed(3)),
    one_click_friction_score: Number(friction.toFixed(3)),
    deploy_success_clarity_score: Number(successClarity.toFixed(3)),
    delivery_assurance_quality_score: Number(assuranceQuality.toFixed(3)),
    final_mile_coherence_score: Number(finalMile.toFixed(3)),
    degraded_delivery_visibility_score: Number(degradedVisibility.toFixed(3)),
    delivery_outcome_accuracy_score: 0.5, // baseline until realized outcomes accumulate
    confidence_label: confidence >= 0.7 ? "High Confidence" : confidence >= 0.4 ? "Moderate Confidence" : "Low Confidence",
    confidence_rationale: confidence >= 0.7
      ? "Validation passed, no critical blockers, deploy path clear."
      : confidence >= 0.4
        ? "Some concerns remain. Review blockers before deploying."
        : "Significant blockers or validation gaps. Not recommended for deploy.",
  };
}
