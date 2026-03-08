/**
 * Architecture Rollout Sandbox Guardrails — Sprint 40
 * Hard guardrails for sandbox rehearsals.
 * Pure functions. No DB access.
 */

export interface SandboxGuardrailInput {
  target_scope: string;
  target_entities: Record<string, any>;
  rehearsal_mode: string;
  blast_radius_size: string;
  affected_layers: string[];
  validation_hooks_defined: boolean;
  rollback_hooks_defined: boolean;
  max_scope_breadth?: number;
  governance_profile_max_breadth?: number;
}

export interface SandboxGuardrailResult {
  allowed: boolean;
  rejection_reasons: string[];
  downgraded_mode: string | null;
  warnings: string[];
}

const FORBIDDEN_MUTATION_FAMILIES = [
  "pipeline_topology", "stage_ordering", "governance_rules", "billing_logic",
  "plan_enforcement", "execution_contracts", "hard_safety_constraints",
  "strategy_families", "policy_families", "tenant_isolation_rules",
];

const VALID_REHEARSAL_MODES = ["dry_run", "staged_preview", "shadow_readiness"];

export function validateSandboxGuardrails(input: SandboxGuardrailInput): SandboxGuardrailResult {
  const rejections: string[] = [];
  const warnings: string[] = [];
  let downgraded: string | null = null;

  // Validate rehearsal mode
  if (!VALID_REHEARSAL_MODES.includes(input.rehearsal_mode)) {
    rejections.push(`Invalid rehearsal mode: ${input.rehearsal_mode}`);
  }

  // Forbidden mutations
  const entities = Object.keys(input.target_entities);
  for (const entity of entities) {
    for (const forbidden of FORBIDDEN_MUTATION_FAMILIES) {
      if (entity.toLowerCase().includes(forbidden)) {
        rejections.push(`Entity "${entity}" touches forbidden mutation family: ${forbidden}`);
      }
    }
  }

  // Scope layers
  for (const layer of input.affected_layers) {
    if (["billing", "governance"].includes(layer)) {
      rejections.push(`Layer "${layer}" is forbidden for sandbox rehearsal`);
    }
  }

  // Scope breadth
  const entityCount = entities.length;
  const maxBreadth = input.governance_profile_max_breadth || input.max_scope_breadth || 20;
  if (entityCount > maxBreadth) {
    rejections.push(`Scope breadth ${entityCount} exceeds max allowed ${maxBreadth}`);
  }

  // Missing hooks
  if (!input.validation_hooks_defined) {
    warnings.push("No validation hooks defined — rehearsal may be incomplete");
    if (input.rehearsal_mode === "shadow_readiness") {
      downgraded = "staged_preview";
      warnings.push("Downgraded from shadow_readiness to staged_preview due to missing validation hooks");
    }
  }
  if (!input.rollback_hooks_defined) {
    warnings.push("No rollback hooks defined — rollback viability cannot be fully assessed");
    if (input.rehearsal_mode === "shadow_readiness") {
      downgraded = downgraded || "staged_preview";
      warnings.push("Downgraded due to missing rollback hooks");
    }
  }

  // Critical blast radius + shadow_readiness → downgrade
  if (input.blast_radius_size === "critical" && input.rehearsal_mode === "shadow_readiness") {
    downgraded = "dry_run";
    warnings.push("Critical blast radius: downgraded to dry_run mode");
  }

  return {
    allowed: rejections.length === 0,
    rejection_reasons: rejections,
    downgraded_mode: downgraded,
    warnings,
  };
}
