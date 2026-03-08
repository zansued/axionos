// Delivery Readiness Evaluator
// Evaluates whether an initiative is actually ready for governed one-click delivery.

export interface DeliveryReadinessResult {
  deploy_readiness_score: number;
  validation_gate_score: number;
  blocker_score: number;
  blockers: DeliveryBlocker[];
  is_ready: boolean;
  readiness_label: string;
  readiness_rationale: string;
}

export interface DeliveryBlocker {
  blocker_type: string;
  severity: "low" | "moderate" | "high" | "critical";
  description: string;
  remediation_hint: string;
}

export function evaluateDeliveryReadiness(
  initiative: {
    stage_status?: string | null;
    build_status?: string | null;
    deploy_url?: string | null;
    repo_url?: string | null;
  },
  pendingApprovals: number,
  validationPassed: boolean,
): DeliveryReadinessResult {
  const blockers: DeliveryBlocker[] = [];
  const stageStatus = initiative.stage_status ?? "draft";

  // Check validation
  if (!validationPassed) {
    blockers.push({
      blocker_type: "validation_not_passed",
      severity: "critical",
      description: "Validation has not passed. Build quality is unconfirmed.",
      remediation_hint: "Run validation pipeline and resolve any failures.",
    });
  }

  // Check approvals
  if (pendingApprovals > 0) {
    blockers.push({
      blocker_type: "pending_approvals",
      severity: "high",
      description: `${pendingApprovals} approval(s) still pending.`,
      remediation_hint: "Review and approve pending gates before deploying.",
    });
  }

  // Check stage readiness
  const deployReadyStages = ["ready_to_publish", "published", "deploying", "deployed"];
  if (!deployReadyStages.includes(stageStatus)) {
    blockers.push({
      blocker_type: "stage_not_ready",
      severity: "high",
      description: `Current stage "${stageStatus}" is not deploy-ready.`,
      remediation_hint: "Complete engineering and validation stages first.",
    });
  }

  // Check build
  if (initiative.build_status === "failed") {
    blockers.push({
      blocker_type: "build_failed",
      severity: "critical",
      description: "Build has failed.",
      remediation_hint: "Fix build errors and re-run the build pipeline.",
    });
  }

  const criticalBlockers = blockers.filter(b => b.severity === "critical").length;
  const highBlockers = blockers.filter(b => b.severity === "high").length;

  const validationGate = validationPassed ? 1.0 : 0;
  const blockerScore = Math.min(1, (criticalBlockers * 0.5 + highBlockers * 0.3 + (blockers.length - criticalBlockers - highBlockers) * 0.1));
  const readiness = Math.max(0, Math.min(1, validationGate * 0.4 + (1 - blockerScore) * 0.4 + (deployReadyStages.includes(stageStatus) ? 0.2 : 0)));

  const isReady = blockers.length === 0 && readiness >= 0.6;

  return {
    deploy_readiness_score: Number(readiness.toFixed(3)),
    validation_gate_score: Number(validationGate.toFixed(3)),
    blocker_score: Number(blockerScore.toFixed(3)),
    blockers,
    is_ready: isReady,
    readiness_label: isReady ? "Ready for One-Click Deploy" : blockers.length > 0 ? "Blocked" : "Not Ready",
    readiness_rationale: isReady
      ? "All gates passed, no blockers, validation confirmed."
      : `${blockers.length} blocker(s) detected. Resolve before deploying.`,
  };
}
