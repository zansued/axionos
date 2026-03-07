/**
 * Advisory Retrieval Context Builder — Sprint 36
 *
 * Builds semantic query contexts for the engineering advisor,
 * recommendation review, and cross-stage policy synthesis.
 */

import type { SemanticQueryContext } from "./semantic-retrieval-engine.ts";

export function buildAdvisoryRecommendationContext(
  organizationId: string,
  opts: {
    advisory_target_scope?: string;
    workspace_id?: string;
  }
): SemanticQueryContext {
  return {
    organization_id: organizationId,
    session_type: "advisory_recommendation",
    advisory_target_scope: opts.advisory_target_scope,
    workspace_id: opts.workspace_id,
    domain_keys: ["engineering_advisory", "engineering_memory", "platform_insights", "strategy_variants"],
    max_results: 12,
  };
}

export function buildCrossStageContext(
  organizationId: string,
  opts: {
    stage_key?: string;
  }
): SemanticQueryContext {
  return {
    organization_id: organizationId,
    session_type: "cross_stage_retrieval",
    stage_key: opts.stage_key,
    domain_keys: ["engineering_memory", "cross_stage_policies", "execution_policies"],
    max_results: 10,
  };
}
