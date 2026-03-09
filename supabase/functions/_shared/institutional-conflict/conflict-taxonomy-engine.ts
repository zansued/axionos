/**
 * Conflict Taxonomy Engine
 * Classifies conflicts by type and subcategory.
 */

export interface ConflictClassification {
  primaryType: string;
  subcategory: string;
  nature: "real_conflict" | "temporary_tension" | "ambiguity" | "healthy_competition" | "governance_violation";
  description: string;
}

const TAXONOMY: Record<string, { subcategories: string[]; description: string }> = {
  doctrine: { subcategories: ["core_vs_local", "scope_overlap", "immutability_breach", "interpretation_divergence"], description: "Conflicts between doctrines or doctrine adaptations" },
  priority: { subcategories: ["resource_contention", "timeline_conflict", "strategic_misalignment"], description: "Competing priorities across domains" },
  policy: { subcategories: ["rule_collision", "exception_overlap", "scope_ambiguity"], description: "Policy rule conflicts" },
  jurisdiction: { subcategories: ["domain_overlap", "authority_ambiguity", "escalation_gap"], description: "Jurisdictional boundary conflicts" },
  resource: { subcategories: ["capacity_contention", "budget_conflict", "capability_gap"], description: "Resource allocation conflicts" },
  sequencing: { subcategories: ["dependency_cycle", "ordering_conflict", "timing_mismatch"], description: "Sequencing and ordering conflicts" },
  compliance: { subcategories: ["regulatory_gap", "audit_finding", "drift_violation"], description: "Compliance and governance conflicts" },
  interpretation: { subcategories: ["semantic_ambiguity", "precedent_divergence", "context_mismatch"], description: "Interpretation and meaning conflicts" },
};

export function classifyConflict(
  conflictType: string,
  conflictSummary: string
): ConflictClassification {
  const taxonomy = TAXONOMY[conflictType] || TAXONOMY.policy;

  // Simple heuristic classification based on keywords
  let subcategory = taxonomy.subcategories[0];
  let nature: ConflictClassification["nature"] = "real_conflict";

  const lower = conflictSummary.toLowerCase();
  if (lower.includes("blocked") || lower.includes("violation")) {
    nature = "governance_violation";
  } else if (lower.includes("temporary") || lower.includes("transient")) {
    nature = "temporary_tension";
  } else if (lower.includes("ambiguo") || lower.includes("unclear")) {
    nature = "ambiguity";
  }

  // Match subcategory from keywords
  for (const sub of taxonomy.subcategories) {
    if (lower.includes(sub.replace(/_/g, " "))) {
      subcategory = sub;
      break;
    }
  }

  return {
    primaryType: conflictType,
    subcategory,
    nature,
    description: taxonomy.description,
  };
}
