/**
 * Weak Compounding Detector — Sprint 122
 * Identifies domains where learning is not compounding effectively.
 */

export interface WeakZoneInput {
  domain_name: string;
  compounding_score: number;
  reuse_density: number;
  failure_resilience: number;
  doctrine_stability: number;
  execution_count: number;
}

export interface WeakZone {
  detected: boolean;
  zone_name: string;
  weakness_type: string;
  severity: "low" | "medium" | "high";
  description: string;
  recommended_action: string;
}

export function detectWeakZones(input: WeakZoneInput): WeakZone[] {
  const zones: WeakZone[] = [];

  if (input.compounding_score < 0.3 && input.execution_count > 20) {
    zones.push({
      detected: true, zone_name: input.domain_name, weakness_type: "low_compounding",
      severity: "high", description: `Domain '${input.domain_name}' has ${input.execution_count} executions but only ${(input.compounding_score * 100).toFixed(0)}% compounding.`,
      recommended_action: "Investigate why execution experience is not converting to reusable advantage.",
    });
  }

  if (input.reuse_density < 0.15 && input.execution_count > 30) {
    zones.push({
      detected: true, zone_name: input.domain_name, weakness_type: "low_reuse",
      severity: "medium", description: `Low reuse density (${(input.reuse_density * 100).toFixed(0)}%) despite significant execution volume.`,
      recommended_action: "Extract and codify reusable patterns from successful executions.",
    });
  }

  if (input.doctrine_stability < 0.3) {
    zones.push({
      detected: true, zone_name: input.domain_name, weakness_type: "unstable_doctrine",
      severity: "medium", description: `Doctrine stability is low (${(input.doctrine_stability * 100).toFixed(0)}%), indicating frequent operating posture changes.`,
      recommended_action: "Stabilize operating doctrine before attempting to compound advantage.",
    });
  }

  return zones;
}
