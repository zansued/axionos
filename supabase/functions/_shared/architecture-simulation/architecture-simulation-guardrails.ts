/**
 * Architecture Simulation Guardrails — Sprint 38
 * Hard simulation guardrails that reject or downgrade proposals touching forbidden families.
 * Pure functions. No DB access.
 */

export interface GuardrailInput {
  proposal_type: string;
  target_scope: string;
  target_entities: Record<string, any>;
  proposal_payload: Record<string, any>;
  safety_class: string;
  scope_profile?: {
    forbidden_entities: any[];
    max_scope_breadth?: number;
    simulation_mode: string;
  };
}

export interface GuardrailResult {
  allowed: boolean;
  blocked_reasons: string[];
  warnings: string[];
  downgraded: boolean;
  effective_safety_class: string;
}

const FORBIDDEN_MUTATION_FAMILIES = [
  "pipeline_topology",
  "stage_ordering",
  "governance_rules",
  "billing_logic",
  "plan_enforcement",
  "execution_contracts",
  "hard_safety_constraints",
  "strategy_families",
  "policy_families",
  "tenant_isolation_rules",
];

const FORBIDDEN_SCOPE_KEYWORDS = [
  "billing", "plan_enforcement", "governance", "hard_safety",
  "execution_contract", "tenant_isolation",
];

export function evaluateGuardrails(input: GuardrailInput): GuardrailResult {
  const blocked: string[] = [];
  const warnings: string[] = [];
  let downgraded = false;
  let effectiveSafety = input.safety_class;

  // Check forbidden mutation families
  const entities = Object.keys(input.target_entities);
  const payload = JSON.stringify(input.proposal_payload).toLowerCase();

  for (const family of FORBIDDEN_MUTATION_FAMILIES) {
    if (entities.some((e) => e.toLowerCase().includes(family)) ||
        payload.includes(family) ||
        input.target_scope.toLowerCase().includes(family)) {
      blocked.push(`Touches forbidden mutation family: ${family}`);
    }
  }

  // Check forbidden scope keywords
  for (const kw of FORBIDDEN_SCOPE_KEYWORDS) {
    if (input.target_scope.toLowerCase().includes(kw)) {
      blocked.push(`Target scope contains forbidden keyword: ${kw}`);
    }
  }

  // Check scope profile constraints
  if (input.scope_profile) {
    const { forbidden_entities, max_scope_breadth, simulation_mode } = input.scope_profile;

    // Check forbidden entities in scope profile
    if (Array.isArray(forbidden_entities)) {
      for (const fe of forbidden_entities) {
        const feStr = typeof fe === "string" ? fe : JSON.stringify(fe);
        if (entities.some((e) => e.includes(feStr))) {
          blocked.push(`Entity forbidden by scope profile: ${feStr}`);
        }
      }
    }

    // Check scope breadth
    if (max_scope_breadth && entities.length > max_scope_breadth) {
      warnings.push(`Scope breadth ${entities.length} exceeds max ${max_scope_breadth} — downgrading to advisory_only`);
      downgraded = true;
      effectiveSafety = "advisory_only";
    }

    // Check simulation mode
    if (simulation_mode === "local_only" && entities.length > 3) {
      warnings.push("local_only scope mode limits simulation to 3 entities max");
      downgraded = true;
    }
  }

  // Auto-downgrade if too broad
  if (entities.length > 15) {
    warnings.push("Extremely broad scope — automatically downgraded to advisory_only");
    downgraded = true;
    effectiveSafety = "advisory_only";
  }

  // Proposals implying direct mutation
  const mutationKeywords = ["auto_apply", "auto_activate", "force_deploy", "bypass_review"];
  for (const mk of mutationKeywords) {
    if (payload.includes(mk)) {
      blocked.push(`Proposal implies direct mutation via: ${mk}`);
    }
  }

  return {
    allowed: blocked.length === 0,
    blocked_reasons: blocked,
    warnings,
    downgraded,
    effective_safety_class: effectiveSafety,
  };
}
