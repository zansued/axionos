// Delivery-Adoption Correlator
// Correlates deploy clarity, handoff quality, and delivery posture with real adoption outcomes.

export interface DeliveryAdoptionCorrelation {
  delivery_success_correlation_score: number;
  post_deploy_adoption_score: number;
  weak_delivery_adoption_links: string[];
  rationale: string;
}

export function correlateDeliveryAdoption(
  deploySucceeded: boolean,
  handoffComplete: boolean,
  hasDeployUrl: boolean,
  hasReturnUsage: boolean,
  milestoneCompletion: number,
): DeliveryAdoptionCorrelation {
  const weakLinks: string[] = [];

  if (deploySucceeded && !hasReturnUsage) weakLinks.push("deploy_succeeded_but_no_return_usage");
  if (deploySucceeded && !handoffComplete) weakLinks.push("deploy_succeeded_but_handoff_incomplete");
  if (!hasDeployUrl && deploySucceeded) weakLinks.push("deploy_succeeded_but_no_visible_url");

  const deployCorrelation = Math.max(0, Math.min(1,
    (deploySucceeded ? 0.4 : 0) +
    (handoffComplete ? 0.2 : 0) +
    (hasReturnUsage ? 0.25 : 0) +
    milestoneCompletion * 0.15
  ));

  const postDeployAdoption = Math.max(0, Math.min(1,
    (hasReturnUsage ? 0.5 : 0) + (handoffComplete ? 0.3 : 0) + (hasDeployUrl ? 0.2 : 0)
  ));

  return {
    delivery_success_correlation_score: Number(deployCorrelation.toFixed(3)),
    post_deploy_adoption_score: Number(postDeployAdoption.toFixed(3)),
    weak_delivery_adoption_links: weakLinks,
    rationale: weakLinks.length === 0
      ? "Delivery and adoption are well-correlated."
      : `${weakLinks.length} weak link(s) detected between delivery and adoption.`,
  };
}
