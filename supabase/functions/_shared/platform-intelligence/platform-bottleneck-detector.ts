// Sprint 30 — Platform Bottleneck Detector
// Identifies systemic bottlenecks: stages with abnormal failure/retry/repair/cost/validation rates

import type { PlatformBehaviorSnapshot, ConcentrationMap } from "./platform-behavior-aggregator.ts";

export interface Bottleneck {
  bottleneck_type: "failure_cascade" | "retry_cascade" | "repair_burden" | "cost_hotspot" | "validation_failure" | "deploy_degradation";
  affected_entity: string;
  entity_type: string;
  severity: "low" | "medium" | "high" | "critical";
  rate: number;
  threshold: number;
  description: string;
  recommended_action: string;
  confidence: number;
}

export interface BottleneckReport {
  bottlenecks: Bottleneck[];
  overall_health: "healthy" | "warning" | "critical";
  reason_codes: string[];
}

const THRESHOLDS = {
  failure_cascade: 0.3,
  retry_cascade: 0.35,
  repair_burden: 0.25,
  cost_hotspot: 0.3,
  validation_failure: 0.3,
  deploy_degradation: 0.7, // success rate below this
};

export function detectBottlenecks(snapshot: PlatformBehaviorSnapshot): BottleneckReport {
  const bottlenecks: Bottleneck[] = [];
  const reasons: string[] = [];

  // Failure cascades
  for (const fc of snapshot.failure_concentration) {
    if (fc.rate > THRESHOLDS.failure_cascade) {
      bottlenecks.push({
        bottleneck_type: "failure_cascade", affected_entity: fc.entity, entity_type: fc.entity_type,
        severity: fc.rate > 0.5 ? "critical" : "high",
        rate: fc.rate, threshold: THRESHOLDS.failure_cascade,
        description: `Stage "${fc.entity}" has ${(fc.rate * 100).toFixed(0)}% failure rate`,
        recommended_action: "Investigate root cause and consider adding validation guard",
        confidence: Math.min(1, fc.count / 5),
      });
      reasons.push(`failure_cascade_${fc.entity}`);
    }
  }

  // Repair burden
  for (const rc of snapshot.repair_concentration) {
    if (rc.rate > THRESHOLDS.repair_burden) {
      bottlenecks.push({
        bottleneck_type: "repair_burden", affected_entity: rc.entity, entity_type: rc.entity_type,
        severity: rc.rate > 0.4 ? "high" : "medium",
        rate: rc.rate, threshold: THRESHOLDS.repair_burden,
        description: `Stage "${rc.entity}" triggers repair in ${(rc.rate * 100).toFixed(0)}% of executions`,
        recommended_action: "Review repair strategies and consider preventive validation",
        confidence: Math.min(1, rc.count / 5),
      });
      reasons.push(`repair_burden_${rc.entity}`);
    }
  }

  // Cost hotspots
  for (const cc of snapshot.cost_concentration) {
    if (cc.rate > THRESHOLDS.cost_hotspot) {
      bottlenecks.push({
        bottleneck_type: "cost_hotspot", affected_entity: cc.entity, entity_type: cc.entity_type,
        severity: cc.rate > 0.5 ? "high" : "medium",
        rate: cc.rate, threshold: THRESHOLDS.cost_hotspot,
        description: `Stage "${cc.entity}" accounts for ${(cc.rate * 100).toFixed(0)}% of total cost`,
        recommended_action: "Consider cost optimization or model routing adjustment",
        confidence: 0.8,
      });
      reasons.push(`cost_hotspot_${cc.entity}`);
    }
  }

  // Deploy degradation
  const gm = snapshot.global_metrics;
  if (gm.total_deploy_attempts > 0 && gm.global_deploy_success_rate < THRESHOLDS.deploy_degradation) {
    bottlenecks.push({
      bottleneck_type: "deploy_degradation", affected_entity: "deploy_pipeline", entity_type: "system",
      severity: gm.global_deploy_success_rate < 0.5 ? "critical" : "high",
      rate: 1 - gm.global_deploy_success_rate, threshold: 1 - THRESHOLDS.deploy_degradation,
      description: `Deploy success rate is ${(gm.global_deploy_success_rate * 100).toFixed(0)}%`,
      recommended_action: "Review deploy-related stages and consider deploy-hardened policy",
      confidence: Math.min(1, gm.total_deploy_attempts / 5),
    });
    reasons.push("deploy_degradation");
  }

  const criticalCount = bottlenecks.filter(b => b.severity === "critical").length;
  const highCount = bottlenecks.filter(b => b.severity === "high").length;
  const overall_health = criticalCount > 0 ? "critical" : highCount > 0 ? "warning" : "healthy";

  return { bottlenecks, overall_health, reason_codes: reasons };
}
