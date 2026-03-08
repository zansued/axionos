// One-Click Delivery Explainer
// Returns structured explanations for readiness, confidence, blockers, outputs, and rollback.

import { evaluateDeliveryReadiness, DeliveryReadinessResult } from "./delivery-readiness-evaluator.ts";
import { computeDeployAssurance, DeployAssuranceResult } from "./deploy-assurance-engine.ts";
import { computeDeliveryOutputVisibility, DeliveryOutputVisibility } from "./delivery-output-visibility-engine.ts";
import { computeRecoveryPosture, RecoveryPosture } from "./deploy-recovery-orchestrator.ts";
import { evaluateHandoffAssurance, HandoffAssurance } from "./handoff-assurance-analyzer.ts";
import { detectDeliveryFriction } from "./delivery-friction-detector.ts";

export interface DeliveryExplanation {
  readiness: DeliveryReadinessResult;
  assurance: DeployAssuranceResult;
  outputs: DeliveryOutputVisibility;
  recovery: RecoveryPosture;
  handoff: HandoffAssurance;
  friction: { signals: any[]; friction_score: number };
  summary: string;
  next_action: string;
}

export function explainDeliveryPosture(
  initiative: {
    stage_status?: string | null;
    build_status?: string | null;
    deploy_url?: string | null;
    repo_url?: string | null;
  },
  pendingApprovals: number,
  validationPassed: boolean,
): DeliveryExplanation {
  const readiness = evaluateDeliveryReadiness(initiative, pendingApprovals, validationPassed);
  const hasDeployUrl = !!initiative.deploy_url;
  const hasRepoUrl = !!initiative.repo_url;
  const deployFailed = initiative.build_status === "failed" || initiative.stage_status === "deploy_failed";

  const recovery = computeRecoveryPosture(initiative.stage_status ?? "draft", hasDeployUrl, hasRepoUrl, deployFailed);
  const assurance = computeDeployAssurance(readiness, hasDeployUrl, hasRepoUrl, hasDeployUrl, recovery.rollback_available);
  const outputs = computeDeliveryOutputVisibility(initiative);
  const handoff = evaluateHandoffAssurance(hasDeployUrl, hasRepoUrl, hasDeployUrl, hasDeployUrl);
  const friction = detectDeliveryFriction(readiness, hasDeployUrl, initiative.stage_status ?? "draft");

  const summary = readiness.is_ready
    ? "Initiative is ready for one-click deployment. All gates passed."
    : `${readiness.blockers.length} blocker(s) prevent deployment. ${readiness.readiness_rationale}`;

  const nextAction = readiness.is_ready
    ? "Deploy Now"
    : readiness.blockers.length > 0
      ? `Resolve ${readiness.blockers.length} blocker(s) first`
      : "Complete validation pipeline";

  return { readiness, assurance, outputs, recovery, handoff, friction, summary, next_action: nextAction };
}
