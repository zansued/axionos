/**
 * Kernel Boundary Registry — Sprint 114
 * Defines and resolves protected kernel domains and identity boundaries.
 */

export interface KernelDomain {
  domain_name: string;
  description: string;
  protection_level: "absolute" | "protected" | "governed" | "advisory";
  mutation_allowed: boolean;
  extraordinary_review_required: boolean;
  invariants: string[];
}

export const CANONICAL_KERNEL_DOMAINS: KernelDomain[] = [
  {
    domain_name: "deterministic_execution_kernel",
    description: "Pipeline DAG, stage ordering, wave computation, and execution flow",
    protection_level: "absolute",
    mutation_allowed: false,
    extraordinary_review_required: true,
    invariants: ["topological_ordering", "deterministic_dispatch", "bounded_concurrency"],
  },
  {
    domain_name: "governance_invariants",
    description: "Trust levels, approval workflows, gate permissions, governance policies",
    protection_level: "absolute",
    mutation_allowed: false,
    extraordinary_review_required: true,
    invariants: ["advisory_first", "governance_before_autonomy", "human_approval_for_structural_change"],
  },
  {
    domain_name: "approval_boundaries",
    description: "Approval gates, review requirements, escalation paths",
    protection_level: "absolute",
    mutation_allowed: false,
    extraordinary_review_required: true,
    invariants: ["no_autonomous_approval", "bounded_delegation", "escalation_preserved"],
  },
  {
    domain_name: "rollback_guarantees",
    description: "Rollback capabilities, state restoration, revert paths",
    protection_level: "absolute",
    mutation_allowed: false,
    extraordinary_review_required: true,
    invariants: ["rollback_everywhere", "state_preservation", "revert_lineage"],
  },
  {
    domain_name: "tenant_isolation",
    description: "RLS policies, organization scoping, cross-tenant boundaries",
    protection_level: "absolute",
    mutation_allowed: false,
    extraordinary_review_required: true,
    invariants: ["rls_enforced", "org_scoped_data", "no_cross_tenant_leakage"],
  },
  {
    domain_name: "plan_billing_enforcement",
    description: "Product plans, billing logic, usage limits, subscription constraints",
    protection_level: "absolute",
    mutation_allowed: false,
    extraordinary_review_required: true,
    invariants: ["plan_limits_enforced", "billing_integrity", "no_autonomous_billing_change"],
  },
  {
    domain_name: "hard_safety_constraints",
    description: "Safety boundaries, kernel integrity guards, forbidden mutations",
    protection_level: "absolute",
    mutation_allowed: false,
    extraordinary_review_required: true,
    invariants: ["no_autonomous_architecture_mutation", "bounded_adaptation", "safety_first"],
  },
  {
    domain_name: "canon_integrity_principles",
    description: "Canonical architecture alignment, documentation conformance, principle adherence",
    protection_level: "protected",
    mutation_allowed: false,
    extraordinary_review_required: true,
    invariants: ["canon_conformance", "architecture_legibility", "principle_adherence"],
  },
];

export function resolveProtectedDomains(customRules?: KernelDomain[]): KernelDomain[] {
  if (!customRules || customRules.length === 0) return CANONICAL_KERNEL_DOMAINS;
  const merged = [...CANONICAL_KERNEL_DOMAINS];
  for (const rule of customRules) {
    const existing = merged.findIndex(d => d.domain_name === rule.domain_name);
    if (existing >= 0) {
      // Cannot weaken absolute protection
      if (merged[existing].protection_level === "absolute") continue;
      merged[existing] = rule;
    } else {
      merged.push(rule);
    }
  }
  return merged;
}

export function isDomainMutationBlocked(domainName: string, domains?: KernelDomain[]): { blocked: boolean; reason: string } {
  const resolved = domains || CANONICAL_KERNEL_DOMAINS;
  const domain = resolved.find(d => d.domain_name === domainName);
  if (!domain) return { blocked: false, reason: "Domain not in protected registry" };
  if (!domain.mutation_allowed) return { blocked: true, reason: `Domain '${domainName}' is ${domain.protection_level}-protected and does not allow mutation` };
  return { blocked: false, reason: "Mutation allowed under governed review" };
}
