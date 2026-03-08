// Friction Cluster Detector
// Identifies repeated friction zones across onboarding, journey progression, approval flow, and delivery.

export interface FrictionCluster {
  zone: string;
  severity: "low" | "moderate" | "high" | "critical";
  occurrence_count: number;
  remediation_hint: string;
}

export interface FrictionAnalysis {
  clusters: FrictionCluster[];
  friction_score: number;
  dropoff_risk_score: number;
}

export function detectFrictionClusters(
  stalledStages: string[],
  failedDeployCount: number,
  abandonedOnboarding: boolean,
  pendingApprovals: number,
): FrictionAnalysis {
  const clusters: FrictionCluster[] = [];

  if (abandonedOnboarding) {
    clusters.push({
      zone: "onboarding",
      severity: "high",
      occurrence_count: 1,
      remediation_hint: "Simplify onboarding flow or offer template-based entry.",
    });
  }

  for (const stage of stalledStages) {
    clusters.push({
      zone: stage,
      severity: "moderate",
      occurrence_count: 1,
      remediation_hint: `User stalled at ${stage}. Consider clearer guidance or reduced requirements.`,
    });
  }

  if (failedDeployCount > 0) {
    clusters.push({
      zone: "deploy",
      severity: failedDeployCount >= 3 ? "critical" : "high",
      occurrence_count: failedDeployCount,
      remediation_hint: "Repeated deploy failures. Check validation pipeline and build quality.",
    });
  }

  if (pendingApprovals > 2) {
    clusters.push({
      zone: "approvals",
      severity: "moderate",
      occurrence_count: pendingApprovals,
      remediation_hint: "Multiple pending approvals may be causing adoption stall.",
    });
  }

  const frictionScore = Math.min(1,
    clusters.reduce((s, c) => s + (c.severity === "critical" ? 0.4 : c.severity === "high" ? 0.25 : c.severity === "moderate" ? 0.15 : 0.05), 0)
  );

  const dropoffRisk = Math.min(1,
    frictionScore * 0.6 + (abandonedOnboarding ? 0.3 : 0) + (stalledStages.length > 2 ? 0.1 : 0)
  );

  return {
    clusters,
    friction_score: Number(frictionScore.toFixed(3)),
    dropoff_risk_score: Number(dropoffRisk.toFixed(3)),
  };
}
