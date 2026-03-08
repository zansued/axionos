// Deploy Recovery Orchestrator
// Manages rollback/recovery posture and degraded delivery states.

export type RecoveryState = "none" | "rollback_available" | "rolling_back" | "rolled_back" | "degraded" | "recovered" | "failed";

export interface RecoveryPosture {
  recovery_state: RecoveryState;
  rollback_available: boolean;
  degraded_delivery_visible: boolean;
  recovery_readiness_score: number;
  degraded_delivery_visibility_score: number;
  recovery_action_label: string;
  recovery_rationale: string;
}

export function computeRecoveryPosture(
  deployState: string,
  hasDeployUrl: boolean,
  hasRepoUrl: boolean,
  deployFailed: boolean,
): RecoveryPosture {
  let state: RecoveryState = "none";
  let rollbackAvailable = false;
  let degradedVisible = false;

  if (deployFailed) {
    state = "rollback_available";
    rollbackAvailable = hasRepoUrl;
    degradedVisible = true;
  } else if (deployState === "deployed" && hasDeployUrl) {
    state = "none";
    rollbackAvailable = hasRepoUrl;
  } else if (deployState === "rolled_back") {
    state = "rolled_back";
    rollbackAvailable = false;
    degradedVisible = true;
  } else if (deployState === "partial") {
    state = "degraded";
    rollbackAvailable = hasRepoUrl;
    degradedVisible = true;
  }

  const recoveryReadiness = rollbackAvailable ? 0.7 : hasRepoUrl ? 0.3 : 0.1;
  const degradedVisibility = degradedVisible ? 0.8 : 0;

  const actionLabel = state === "rollback_available"
    ? "Rollback to previous version"
    : state === "degraded"
      ? "Review degraded deployment"
      : state === "rolled_back"
        ? "Redeploy when ready"
        : state === "none" && hasDeployUrl
          ? "Deployment healthy"
          : "No recovery action needed";

  return {
    recovery_state: state,
    rollback_available: rollbackAvailable,
    degraded_delivery_visible: degradedVisible,
    recovery_readiness_score: Number(recoveryReadiness.toFixed(3)),
    degraded_delivery_visibility_score: Number(degradedVisibility.toFixed(3)),
    recovery_action_label: actionLabel,
    recovery_rationale: rollbackAvailable
      ? "Repository is available for rollback if needed."
      : "No rollback target available. Manual recovery may be required.",
  };
}
