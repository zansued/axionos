/**
 * Runtime Retrieval Context Builder — Sprint 36
 *
 * Builds semantic query contexts for runtime agent execution,
 * repair policy selection, and predictive error detection.
 */

import type { SemanticQueryContext } from "./semantic-retrieval-engine.ts";

export function buildRuntimeAgentContext(
  organizationId: string,
  opts: {
    agent_type: string;
    stage_key?: string;
    execution_context_class?: string;
  }
): SemanticQueryContext {
  return {
    organization_id: organizationId,
    session_type: "runtime_agent",
    agent_type: opts.agent_type,
    stage_key: opts.stage_key,
    execution_context_class: opts.execution_context_class,
    domain_keys: ["engineering_memory", "agent_memory"],
    max_results: 8,
  };
}

export function buildRepairContext(
  organizationId: string,
  opts: {
    error_signature?: string;
    stage_key?: string;
  }
): SemanticQueryContext {
  return {
    organization_id: organizationId,
    session_type: "repair_retrieval",
    error_signature: opts.error_signature,
    stage_key: opts.stage_key,
    domain_keys: ["repair_history", "engineering_memory", "agent_memory"],
    max_results: 10,
  };
}

export function buildPredictiveContext(
  organizationId: string,
  opts: {
    stage_key?: string;
    execution_context_class?: string;
  }
): SemanticQueryContext {
  return {
    organization_id: organizationId,
    session_type: "predictive_retrieval",
    stage_key: opts.stage_key,
    execution_context_class: opts.execution_context_class,
    domain_keys: ["repair_history", "engineering_memory", "platform_insights"],
    max_results: 8,
  };
}
