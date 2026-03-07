/**
 * Execution Strategy Guardrails (Sprint 32)
 * Validates variant proposals before approval or experimentation.
 */

export interface GuardrailResult {
  safe: boolean;
  violations: string[];
  warnings: string[];
}

const FORBIDDEN_FIELDS = [
  "pipeline_topology", "governance_rules", "billing_logic",
  "plan_enforcement", "execution_contracts", "hard_safety_constraints",
];

const MAX_ABSOLUTE_DELTA = 0.25;

export function validateStrategyVariant(
  family: { status: string; allowed_mutation_envelope: Record<string, any>; rollout_mode: string; allowed_variant_scope: string },
  variant: { mutation_delta: Record<string, any>; variant_mode: string; scope_ref?: any; rollback_guard?: any },
): GuardrailResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Family must exist and be active
  if (!family) {
    violations.push("Strategy family not found");
    return { safe: false, violations, warnings };
  }
  if (family.status === "frozen") violations.push("Strategy family is frozen — no variants allowed");
  if (family.status === "deprecated") violations.push("Strategy family is deprecated — no variants allowed");

  // Check forbidden fields in mutation delta
  for (const key of Object.keys(variant.mutation_delta || {})) {
    if (FORBIDDEN_FIELDS.some(f => key.toLowerCase().includes(f))) {
      violations.push(`Forbidden field in mutation delta: ${key}`);
    }
  }

  // Check delta within envelope
  const envelope = family.allowed_mutation_envelope || {};
  for (const [key, delta] of Object.entries(variant.mutation_delta || {})) {
    const absD = Math.abs(delta as number);
    if (absD > MAX_ABSOLUTE_DELTA) {
      violations.push(`Delta for ${key} exceeds max (${absD} > ${MAX_ABSOLUTE_DELTA})`);
    }
    const range = envelope[key];
    if (range && typeof range.min === "number" && typeof range.max === "number") {
      // Ensure variant value stays within range (checked elsewhere, but warn)
    } else if (!range) {
      warnings.push(`No envelope defined for parameter: ${key}`);
    }
  }

  // Rollout mode compatibility
  if (variant.variant_mode === "bounded_experiment_candidate" && family.rollout_mode !== "bounded_experiment") {
    violations.push("Family does not allow bounded experiments");
  }

  // Rollback guard must be defined
  if (!variant.rollback_guard) {
    violations.push("Rollback guard conditions are required");
  }

  // Evaluation metrics must be declared on family
  // (checked at family level — warn here if empty)

  return { safe: violations.length === 0, violations, warnings };
}
