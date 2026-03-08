// Adoption Intelligence Explainer
// Returns structured explanations for success signals, friction, drop-off risk, and improvement recommendations.

import { computeSuccessSignals, SuccessSignalResult } from "./customer-success-signal-engine.ts";
import { analyzeJourneyAdoption, JourneyAnalysis } from "./adoption-journey-analyzer.ts";
import { detectFrictionClusters, FrictionAnalysis } from "./friction-cluster-detector.ts";
import { analyzeTemplateEffectiveness, TemplateEffectiveness } from "./template-and-starter-effectiveness-analyzer.ts";
import { correlateDeliveryAdoption, DeliveryAdoptionCorrelation } from "./delivery-adoption-correlator.ts";
import { computeInterventionPriorities, InterventionAnalysis } from "./intervention-priority-engine.ts";

export interface AdoptionExplanation {
  success: SuccessSignalResult;
  journey: JourneyAnalysis;
  friction: FrictionAnalysis;
  templates: TemplateEffectiveness;
  delivery: DeliveryAdoptionCorrelation;
  interventions: InterventionAnalysis;
  summary: string;
  next_action: string;
}

export function explainAdoptionPosture(
  stageStatus: string,
  completedStages: string[],
  stalledStages: string[],
  deploySucceeded: boolean,
  hasDeployUrl: boolean,
  handoffComplete: boolean,
  hasReturnUsage: boolean,
  templateUsed: boolean,
  starterUsed: boolean,
  abandonedOnboarding: boolean,
  failedDeployCount: number,
  pendingApprovals: number,
): AdoptionExplanation {
  const journey = analyzeJourneyAdoption(stageStatus, completedStages, stalledStages);
  const friction = detectFrictionClusters(stalledStages, failedDeployCount, abandonedOnboarding, pendingApprovals);
  const success = computeSuccessSignals(journey.journey_depth_score, deploySucceeded, hasReturnUsage, friction.friction_score, friction.dropoff_risk_score);
  const templates = analyzeTemplateEffectiveness(templateUsed, starterUsed, journey.journey_depth_score, deploySucceeded, friction.friction_score);
  const delivery = correlateDeliveryAdoption(deploySucceeded, handoffComplete, hasDeployUrl, hasReturnUsage, journey.journey_depth_score);
  const interventions = computeInterventionPriorities(friction.friction_score, friction.dropoff_risk_score, stalledStages, abandonedOnboarding, journey.journey_depth_score);

  const summary = success.signal_label === "Strong Success"
    ? "User is adopting the platform successfully with good journey completion."
    : success.signal_label === "Partial Success"
    ? `Partial adoption. ${friction.clusters.length} friction zone(s) detected.`
    : `At risk. ${friction.clusters.length} friction zone(s), dropoff risk ${(friction.dropoff_risk_score * 100).toFixed(0)}%.`;

  const nextAction = interventions.candidates.length > 0
    ? interventions.candidates[0].description
    : "No intervention needed at this time.";

  return { success, journey, friction, templates, delivery, interventions, summary, next_action: nextAction };
}
