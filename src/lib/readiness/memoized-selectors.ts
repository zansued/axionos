/**
 * Memoized Readiness Selectors — Proxy-Based
 *
 * Uses proxy-memoize to avoid re-evaluating readiness checks
 * when irrelevant metadata fields change on the initiative object.
 *
 * Only the fields actually accessed by stage checks trigger re-computation.
 */

import { proxyMemoize } from "@/lib/proxy-memoize";
import { evaluateInitiativeReadiness } from "./readiness-engine";
import type { InitiativeReadinessInput, ReadinessResult } from "./readiness-types";

/**
 * Memoized readiness score selector.
 * Only re-computes when fields actually used by the readiness checks change.
 *
 * Tracked fields per stage (auto-detected via proxy):
 * - idea: title, description, idea_raw, risk_level
 * - discovery: discovery_payload, approved_at_discovery, prd_content
 * - architecture: architecture_content, blueprint, simulation_report, approved_at_planning
 * - engineering: agentsCount, approved_at_squad, storiesCount, artifactsCount, repo_url
 * - validation: approvedArtifacts, build_status, jobsFailedCount
 * - deploy: repo_url, build_status, deploy_target, commit_hash
 * - runtime: deploy_url, deploy_status
 */
export const selectReadiness = proxyMemoize<InitiativeReadinessInput, ReadinessResult>(
  (input) => evaluateInitiativeReadiness(input),
);

/**
 * Memoized risk assessment selector.
 * Only depends on: risk_level, health_status, jobsFailedCount, build_status, deploy_status
 */
export const selectRiskAssessment = proxyMemoize<
  InitiativeReadinessInput,
  { level: string; score: number; factors: string[] }
>((input) => {
  const factors: string[] = [];
  let score = 0;

  // Risk level
  if (input.risk_level === "high" || input.risk_level === "critical") {
    score += 40;
    factors.push(`Risk level: ${input.risk_level}`);
  } else if (input.risk_level === "medium") {
    score += 20;
    factors.push("Risk level: medium");
  }

  // Health
  if (input.health_status === "degraded" || input.health_status === "critical") {
    score += 30;
    factors.push(`Health: ${input.health_status}`);
  }

  // Failed jobs
  const failedJobs = input.jobsFailedCount ?? 0;
  if (failedJobs > 0) {
    score += Math.min(failedJobs * 10, 30);
    factors.push(`${failedJobs} failed job(s)`);
  }

  // Build status
  if (input.build_status === "failing" || input.build_status === "failed") {
    score += 20;
    factors.push("Build failing");
  }

  // Deploy status
  if (input.deploy_status === "failed") {
    score += 20;
    factors.push("Deploy failed");
  }

  const level = score >= 60 ? "critical" : score >= 30 ? "high" : score >= 10 ? "medium" : "low";

  return { level, score: Math.min(score, 100), factors };
});
