/**
 * Semantic Retrieval Guardrails — Sprint 36
 *
 * Hard rules:
 * - No cross-tenant leakage
 * - No scope escalation
 * - No deprecated domains by default
 * - No unsafe hidden retrieval
 * - Fallback to structured retrieval when semantic unavailable
 *
 * SAFETY: Pure validation. No mutations.
 */

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  warnings: string[];
}

interface GuardrailContext {
  organization_id: string;
  domain_keys?: string[];
  session_type: string;
}

const FORBIDDEN_DOMAINS = [
  "billing_data",
  "auth_credentials",
  "payment_records",
  "internal_admin",
];

const FORBIDDEN_MUTATION_FAMILIES = [
  "pipeline_topology",
  "governance_rules",
  "billing_logic",
  "plan_enforcement",
  "execution_contracts",
  "hard_safety_constraints",
  "trust_boundaries",
  "multi_tenant_isolation",
];

export function validateRetrievalGuardrails(ctx: GuardrailContext): GuardrailResult {
  const warnings: string[] = [];

  // 1. Organization ID required
  if (!ctx.organization_id) {
    return { allowed: false, reason: "organization_id is required for tenant isolation", warnings };
  }

  // 2. No forbidden domains
  if (ctx.domain_keys) {
    for (const key of ctx.domain_keys) {
      if (FORBIDDEN_DOMAINS.includes(key)) {
        return { allowed: false, reason: `Domain '${key}' is forbidden for retrieval`, warnings };
      }
    }
  }

  // 3. Session type validation
  if (!ctx.session_type) {
    warnings.push("session_type not specified; defaulting to 'ad_hoc'");
  }

  return { allowed: true, warnings };
}

/**
 * Validate that a retrieval result does not violate mutation boundaries.
 * This is a safety check at the consumption layer.
 */
export function validateRetrievalUsage(usage_intent: string): GuardrailResult {
  const warnings: string[] = [];

  for (const family of FORBIDDEN_MUTATION_FAMILIES) {
    if (usage_intent.toLowerCase().includes(family)) {
      return {
        allowed: false,
        reason: `Retrieval results cannot be used to mutate '${family}'`,
        warnings,
      };
    }
  }

  return { allowed: true, warnings };
}
