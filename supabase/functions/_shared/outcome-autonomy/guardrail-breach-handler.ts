/**
 * Guardrail Breach Handler — Sprint 121
 * Classifies and handles guardrail breaches for autonomy domains.
 */

const HARD_GUARDRAILS = [
  "architecture_mutation",
  "governance_override",
  "billing_alteration",
  "tenant_isolation_bypass",
  "kernel_integrity_violation",
  "safety_constraint_bypass",
];

export interface BreachInput {
  action_attempted: string;
  domain_name: string;
  autonomy_level: number;
}

export interface BreachResult {
  is_breach: boolean;
  breach_type: string;
  severity: "low" | "medium" | "high" | "critical";
  blocked: boolean;
  requires_immediate_downgrade: boolean;
  description: string;
}

export function classifyBreach(input: BreachInput): BreachResult {
  const isHard = HARD_GUARDRAILS.some((g) => input.action_attempted.toLowerCase().includes(g));

  if (isHard) {
    return {
      is_breach: true,
      breach_type: "hard_guardrail",
      severity: "critical",
      blocked: true,
      requires_immediate_downgrade: true,
      description: `Hard guardrail breach: '${input.action_attempted}' attempted in domain '${input.domain_name}' at level ${input.autonomy_level}. This action is permanently forbidden.`,
    };
  }

  // Soft breach: action attempted beyond current level
  return {
    is_breach: true,
    breach_type: "soft_guardrail",
    severity: "medium",
    blocked: true,
    requires_immediate_downgrade: false,
    description: `Soft guardrail breach: '${input.action_attempted}' attempted in domain '${input.domain_name}' at level ${input.autonomy_level}. Action exceeds current autonomy permissions.`,
  };
}
