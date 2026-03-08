// Delivery Friction Detector
// Detects friction between "one-click" expectation and actual deploy readiness/blockers.

import { DeliveryReadinessResult } from "./delivery-readiness-evaluator.ts";

export interface DeliveryFrictionSignal {
  friction_type: string;
  severity: "low" | "moderate" | "high";
  description: string;
  remediation_hint: string;
}

export function detectDeliveryFriction(
  readiness: DeliveryReadinessResult,
  hasDeployUrl: boolean,
  deployState: string,
): { signals: DeliveryFrictionSignal[]; friction_score: number } {
  const signals: DeliveryFrictionSignal[] = [];

  if (!readiness.is_ready && readiness.blockers.length > 0) {
    signals.push({
      friction_type: "blockers_present",
      severity: "high",
      description: `${readiness.blockers.length} blocker(s) prevent one-click delivery.`,
      remediation_hint: "Resolve all blockers before attempting deploy.",
    });
  }

  if (readiness.deploy_readiness_score < 0.5 && readiness.deploy_readiness_score > 0) {
    signals.push({
      friction_type: "low_readiness",
      severity: "moderate",
      description: "Deploy readiness is below threshold. Deploy may not succeed.",
      remediation_hint: "Complete remaining validation and approval steps.",
    });
  }

  if (deployState === "failed") {
    signals.push({
      friction_type: "previous_failure",
      severity: "high",
      description: "A previous deploy attempt failed. Retry requires investigation.",
      remediation_hint: "Review failure logs before retrying deploy.",
    });
  }

  if (deployState === "deployed" && !hasDeployUrl) {
    signals.push({
      friction_type: "missing_deploy_url",
      severity: "moderate",
      description: "Deploy state shows 'deployed' but no deploy URL is visible.",
      remediation_hint: "Check deploy outputs and ensure URL is captured.",
    });
  }

  const frictionScore = Math.min(1, signals.reduce((acc, s) => {
    return acc + (s.severity === "high" ? 0.4 : s.severity === "moderate" ? 0.2 : 0.1);
  }, 0));

  return { signals, friction_score: Number(frictionScore.toFixed(3)) };
}
