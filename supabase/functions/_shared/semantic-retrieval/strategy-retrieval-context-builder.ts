/**
 * Strategy Retrieval Context Builder — Sprint 36
 *
 * Builds semantic query contexts for strategy evolution,
 * strategy portfolio governance, and execution policy intelligence.
 */

import type { SemanticQueryContext } from "./semantic-retrieval-engine.ts";

export function buildStrategyEvolutionContext(
  organizationId: string,
  opts: {
    strategy_family?: string;
    execution_context_class?: string;
  }
): SemanticQueryContext {
  return {
    organization_id: organizationId,
    session_type: "strategy_evolution",
    strategy_family: opts.strategy_family,
    execution_context_class: opts.execution_context_class,
    domain_keys: ["strategy_variants", "engineering_memory", "platform_insights"],
    max_results: 10,
  };
}

export function buildPortfolioGovernanceContext(
  organizationId: string,
  opts: {
    strategy_family?: string;
  }
): SemanticQueryContext {
  return {
    organization_id: organizationId,
    session_type: "portfolio_governance",
    strategy_family: opts.strategy_family,
    domain_keys: ["strategy_variants", "execution_policies", "engineering_memory"],
    max_results: 10,
  };
}

export function buildPolicyIntelligenceContext(
  organizationId: string,
  opts: {
    policy_family?: string;
    execution_context_class?: string;
  }
): SemanticQueryContext {
  return {
    organization_id: organizationId,
    session_type: "policy_intelligence",
    policy_family: opts.policy_family,
    execution_context_class: opts.execution_context_class,
    domain_keys: ["execution_policies", "engineering_memory", "platform_insights"],
    max_results: 10,
  };
}
