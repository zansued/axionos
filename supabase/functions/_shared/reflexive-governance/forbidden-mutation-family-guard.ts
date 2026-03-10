/**
 * Forbidden Mutation Family Guard — Sprint 112
 * Blocks or restricts mutations that touch protected system domains.
 */

export const FORBIDDEN_FAMILIES = [
  "pipeline_topology",
  "governance_rules",
  "billing_logic",
  "plan_enforcement",
  "execution_contracts",
  "hard_safety_constraints",
] as const;

export type ForbiddenFamily = typeof FORBIDDEN_FAMILIES[number];

const FAMILY_DESCRIPTIONS: Record<ForbiddenFamily, string> = {
  pipeline_topology: "Pipeline stage ordering, DAG structure, and execution flow topology",
  governance_rules: "Trust levels, approval workflows, gate permissions, and governance policies",
  billing_logic: "Billing calculations, plan enforcement, and commercial configuration",
  plan_enforcement: "Product plan limits, usage enforcement, and subscription constraints",
  execution_contracts: "Agent task contracts, artifact schemas, and execution protocols",
  hard_safety_constraints: "Safety boundaries, tenant isolation, and kernel integrity guards",
};

export interface ForbiddenFamilyCheckInput {
  affected_components: string[];
  affected_tables: string[];
  mutation_description: string;
  changes_topology: boolean;
  changes_governance: boolean;
  changes_billing: boolean;
  changes_contracts: boolean;
  changes_safety: boolean;
}

export interface ForbiddenFamilyResult {
  blocked: boolean;
  detected_families: ForbiddenFamily[];
  details: Array<{ family: ForbiddenFamily; reason: string; description: string }>;
  override_possible: boolean;
  recommendation: string;
}

export function checkForbiddenFamilies(input: ForbiddenFamilyCheckInput): ForbiddenFamilyResult {
  const detected: Array<{ family: ForbiddenFamily; reason: string; description: string }> = [];

  if (input.changes_topology) {
    detected.push({ family: "pipeline_topology", reason: "Mutation modifies pipeline topology or stage ordering", description: FAMILY_DESCRIPTIONS.pipeline_topology });
  }
  if (input.changes_governance) {
    detected.push({ family: "governance_rules", reason: "Mutation modifies governance rules or trust levels", description: FAMILY_DESCRIPTIONS.governance_rules });
  }
  if (input.changes_billing) {
    detected.push({ family: "billing_logic", reason: "Mutation modifies billing or commercial logic", description: FAMILY_DESCRIPTIONS.billing_logic });
  }
  if (input.changes_contracts) {
    detected.push({ family: "execution_contracts", reason: "Mutation modifies execution contracts or agent protocols", description: FAMILY_DESCRIPTIONS.execution_contracts });
  }
  if (input.changes_safety) {
    detected.push({ family: "hard_safety_constraints", reason: "Mutation modifies hard safety constraints or tenant isolation", description: FAMILY_DESCRIPTIONS.hard_safety_constraints });
  }

  // Heuristic detection from component/table names
  const allNames = [...input.affected_components, ...input.affected_tables].map(n => n.toLowerCase());
  if (allNames.some(n => n.includes("billing") || n.includes("plan_") || n.includes("product_plan"))) {
    if (!detected.some(d => d.family === "billing_logic")) {
      detected.push({ family: "billing_logic", reason: "Affected components include billing-related names", description: FAMILY_DESCRIPTIONS.billing_logic });
    }
  }
  if (allNames.some(n => n.includes("plan_enforcement") || n.includes("usage_limit"))) {
    if (!detected.some(d => d.family === "plan_enforcement")) {
      detected.push({ family: "plan_enforcement", reason: "Affected components include plan enforcement", description: FAMILY_DESCRIPTIONS.plan_enforcement });
    }
  }

  const blocked = detected.length > 0;
  const families = detected.map(d => d.family);

  return {
    blocked,
    detected_families: families,
    details: detected,
    override_possible: blocked && detected.length <= 1,
    recommendation: blocked
      ? `BLOCKED — ${detected.length} forbidden mutation families detected: ${families.join(", ")}. Requires extraordinary human override under governance review.`
      : "No forbidden families detected. Mutation may proceed through normal governance.",
  };
}
