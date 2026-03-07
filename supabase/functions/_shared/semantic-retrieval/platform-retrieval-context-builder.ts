/**
 * Platform Retrieval Context Builder — Sprint 36
 *
 * Builds semantic query contexts for platform intelligence,
 * self-calibration, and self-stabilization.
 */

import type { SemanticQueryContext } from "./semantic-retrieval-engine.ts";

export function buildPlatformIntelligenceContext(
  organizationId: string,
  opts: {
    platform_context?: string;
  }
): SemanticQueryContext {
  return {
    organization_id: organizationId,
    session_type: "platform_intelligence",
    platform_context: opts.platform_context,
    domain_keys: ["platform_insights", "engineering_memory", "stabilization_actions"],
    max_results: 12,
  };
}

export function buildCalibrationContext(
  organizationId: string,
  opts: {
    platform_context?: string;
  }
): SemanticQueryContext {
  return {
    organization_id: organizationId,
    session_type: "platform_calibration",
    platform_context: opts.platform_context,
    domain_keys: ["platform_calibration", "platform_insights", "engineering_memory"],
    max_results: 8,
  };
}

export function buildStabilizationContext(
  organizationId: string,
  opts: {
    platform_context?: string;
  }
): SemanticQueryContext {
  return {
    organization_id: organizationId,
    session_type: "platform_stabilization",
    platform_context: opts.platform_context,
    domain_keys: ["stabilization_actions", "platform_insights", "engineering_memory"],
    max_results: 10,
  };
}
