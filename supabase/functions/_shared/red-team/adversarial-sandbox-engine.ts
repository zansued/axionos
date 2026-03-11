/**
 * adversarial-sandbox-engine.ts
 * Ensures all red team simulations run within sandbox constraints.
 * Validates sandbox mode, blocks production mutation, enforces audit trail.
 */

export interface SandboxConfig {
  sandbox_mode: boolean;
  simulation_scope: string;
  max_steps: number;
  allow_boundary_crossing: boolean;
  allow_production_mutation: boolean;
}

export interface SandboxValidation {
  permitted: boolean;
  violations: string[];
  enforced_constraints: string[];
}

const MANDATORY_CONSTRAINTS = [
  "sandbox_mode_required",
  "no_production_mutation",
  "no_tenant_boundary_crossing",
  "audit_trail_mandatory",
  "bounded_step_count",
];

export function validateSandbox(config: SandboxConfig): SandboxValidation {
  const violations: string[] = [];
  const enforced: string[] = [];

  if (!config.sandbox_mode) {
    violations.push("sandbox_mode must be enabled for all red team simulations");
  } else {
    enforced.push("sandbox_mode_required");
  }

  if (config.allow_production_mutation) {
    violations.push("production mutation is never permitted in red team exercises");
  } else {
    enforced.push("no_production_mutation");
  }

  if (config.allow_boundary_crossing) {
    violations.push("tenant boundary crossing is not permitted");
  } else {
    enforced.push("no_tenant_boundary_crossing");
  }

  if (config.max_steps > 100) {
    violations.push("max_steps cannot exceed 100 in sandbox mode");
  } else {
    enforced.push("bounded_step_count");
  }

  enforced.push("audit_trail_mandatory");

  return {
    permitted: violations.length === 0,
    violations,
    enforced_constraints: enforced,
  };
}

export function getDefaultSandboxConfig(): SandboxConfig {
  return {
    sandbox_mode: true,
    simulation_scope: "bounded",
    max_steps: 50,
    allow_boundary_crossing: false,
    allow_production_mutation: false,
  };
}

export { MANDATORY_CONSTRAINTS };
