/**
 * Kernel Protection Recommender — Sprint 114
 * Generates defensive action recommendations based on kernel health signals.
 */

export interface ProtectionInput {
  overall_health_score: number;
  bloat_score: number;
  corrosion_score: number;
  existential_drift_score: number;
  mutation_pressure_score: number;
  governance_integrity_score: number;
  posture: string;
}

export interface ProtectionRecommendation {
  action_type: "freeze" | "simplify" | "deprecate" | "consolidate" | "extraordinary_review" | "monitor" | "no_action";
  target_domain: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  urgency_score: number;
}

export interface ProtectionResult {
  recommendations: ProtectionRecommendation[];
  overall_recommendation: string;
}

export function recommendProtection(input: ProtectionInput): ProtectionResult {
  const recs: ProtectionRecommendation[] = [];

  if (input.existential_drift_score > 0.6) {
    recs.push({
      action_type: "freeze",
      target_domain: "all_evolution",
      description: "Halt all non-essential evolution proposals until existential drift is resolved",
      priority: "critical",
      urgency_score: 0.95,
    });
  }

  if (input.corrosion_score > 0.5) {
    recs.push({
      action_type: "extraordinary_review",
      target_domain: "governance_invariants",
      description: "Conduct extraordinary review of governance enforcement and boundary integrity",
      priority: input.corrosion_score > 0.7 ? "critical" : "high",
      urgency_score: input.corrosion_score,
    });
  }

  if (input.bloat_score > 0.5) {
    recs.push({
      action_type: "simplify",
      target_domain: "architecture",
      description: "Simplify architecture by deprecating unused modules and merging duplicate surfaces",
      priority: input.bloat_score > 0.7 ? "high" : "medium",
      urgency_score: input.bloat_score * 0.8,
    });
  }

  if (input.bloat_score > 0.6) {
    recs.push({
      action_type: "deprecate",
      target_domain: "inactive_modules",
      description: "Deprecate inactive modules contributing to architectural bloat",
      priority: "medium",
      urgency_score: input.bloat_score * 0.7,
    });
  }

  if (input.mutation_pressure_score > 0.6) {
    recs.push({
      action_type: "consolidate",
      target_domain: "mutation_pipeline",
      description: "Consolidate mutation proposals and reduce change velocity",
      priority: "high",
      urgency_score: input.mutation_pressure_score * 0.85,
    });
  }

  if (input.governance_integrity_score < 0.6) {
    recs.push({
      action_type: "extraordinary_review",
      target_domain: "governance_mechanisms",
      description: "Review and reinforce governance enforcement mechanisms",
      priority: "high",
      urgency_score: (1 - input.governance_integrity_score) * 0.9,
    });
  }

  if (recs.length === 0) {
    recs.push({
      action_type: "monitor",
      target_domain: "kernel",
      description: "Kernel integrity is healthy. Continue routine monitoring.",
      priority: "low",
      urgency_score: 0.1,
    });
  }

  // Sort by urgency
  recs.sort((a, b) => b.urgency_score - a.urgency_score);

  let overall = "Kernel integrity is healthy. No immediate action required.";
  if (input.posture === "critical") overall = "CRITICAL: Kernel integrity is severely compromised. Immediate extraordinary review and evolution freeze recommended.";
  else if (input.posture === "degrading") overall = "WARNING: Kernel integrity is degrading. Active remediation recommended before further evolution.";
  else if (input.posture === "stable") overall = "Kernel is stable but shows early signals. Proactive monitoring recommended.";

  return { recommendations: recs, overall_recommendation: overall };
}
