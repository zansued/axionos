/**
 * Fragility Detector — Sprint 102
 * Detects single points of failure and institutional fragility.
 */

import { AssetDependencyMap } from "./critical-asset-mapper.ts";

export interface FragilityFinding {
  finding_type: "single_point_of_failure" | "no_fallback" | "high_recovery_complexity" | "orphan_critical" | "chain_fragility";
  severity: "low" | "moderate" | "high" | "critical";
  asset_code: string;
  description: string;
}

export function detectFragilities(maps: AssetDependencyMap[]): FragilityFinding[] {
  const findings: FragilityFinding[] = [];

  for (const m of maps) {
    if (m.is_single_point_of_failure) {
      findings.push({
        finding_type: "single_point_of_failure",
        severity: "critical",
        asset_code: m.asset.asset_code,
        description: `"${m.asset.asset_name}" is a single point of failure — ${m.dependents.length} assets depend on it without fallback.`,
      });
    }

    for (const dep of m.dependencies) {
      if (!dep.dependency.fallback_exists) {
        findings.push({
          finding_type: "no_fallback",
          severity: dep.dependency.dependency_strength === "critical" ? "high" : "moderate",
          asset_code: m.asset.asset_code,
          description: `"${m.asset.asset_name}" depends on "${dep.target.asset_name}" with no fallback (strength: ${dep.dependency.dependency_strength}).`,
        });
      }
      if (dep.dependency.recovery_complexity === "high" || dep.dependency.recovery_complexity === "extreme") {
        findings.push({
          finding_type: "high_recovery_complexity",
          severity: "high",
          asset_code: m.asset.asset_code,
          description: `Recovery of "${dep.target.asset_name}" (dependency of "${m.asset.asset_name}") has ${dep.dependency.recovery_complexity} complexity.`,
        });
      }
    }

    if (m.asset.criticality_level === "critical" && m.dependencies.length === 0 && m.dependents.length === 0) {
      findings.push({
        finding_type: "orphan_critical",
        severity: "moderate",
        asset_code: m.asset.asset_code,
        description: `"${m.asset.asset_name}" is critical but has no mapped dependencies — may indicate incomplete mapping.`,
      });
    }

    if (m.criticality_chain_depth > 3) {
      findings.push({
        finding_type: "chain_fragility",
        severity: "high",
        asset_code: m.asset.asset_code,
        description: `"${m.asset.asset_name}" has a dependency chain depth of ${m.criticality_chain_depth} — long chains increase fragility.`,
      });
    }
  }

  return findings;
}
