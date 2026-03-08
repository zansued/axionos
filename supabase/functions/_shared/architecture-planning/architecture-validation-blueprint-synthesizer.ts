/**
 * Architecture Validation Blueprint Synthesizer — Sprint 39
 * Generates validation requirements for architecture change plans.
 * Pure functions. No DB access.
 */

export interface ValidationBlueprintInput {
  proposal_type: string;
  target_scope: string;
  affected_layers: string[];
  blast_radius_size: "small" | "medium" | "large" | "critical";
  tenant_impact: boolean;
  high_risk_nodes: string[];
}

export interface ValidationCheckpoint {
  checkpoint_id: string;
  checkpoint_type: string;
  description: string;
  priority: "required" | "recommended" | "optional";
  target_layer: string;
}

export interface ValidationBlueprint {
  checkpoints: ValidationCheckpoint[];
  regression_requirements: string[];
  compatibility_checks: string[];
  coverage_requirements: string[];
  estimated_validation_effort: "low" | "moderate" | "high" | "very_high";
}

const LAYER_VALIDATION_MAP: Record<string, string[]> = {
  execution: ["runtime_checkpoint", "latency_regression"],
  governance: ["contract_compliance", "policy_compatibility"],
  control: ["selection_regression", "routing_stability"],
  data: ["persistence_integrity", "migration_safety"],
  memory: ["retrieval_accuracy", "memory_boundary"],
  observability: ["coverage_completeness", "telemetry_integrity"],
  strategy: ["strategy_compatibility", "variant_isolation"],
  policy: ["policy_compatibility", "scope_boundary"],
  tenant: ["tenant_isolation", "workspace_boundary"],
  platform: ["platform_health", "system_stability"],
  retrieval: ["semantic_accuracy", "index_integrity"],
  prevention: ["rule_consistency", "false_positive_check"],
  repair: ["repair_path_validity", "strategy_regression"],
  learning: ["learning_edge_integrity", "signal_quality"],
};

export function synthesizeValidationBlueprint(input: ValidationBlueprintInput): ValidationBlueprint {
  const checkpoints: ValidationCheckpoint[] = [];
  let checkpointId = 0;

  for (const layer of input.affected_layers) {
    const validations = LAYER_VALIDATION_MAP[layer] || ["general_validation"];
    for (const vType of validations) {
      checkpoints.push({
        checkpoint_id: `vc-${++checkpointId}`,
        checkpoint_type: vType,
        description: `Validate ${vType.replace(/_/g, " ")} for ${layer} layer`,
        priority: input.high_risk_nodes.some((n) => n.toLowerCase().includes(layer)) ? "required" : "recommended",
        target_layer: layer,
      });
    }
  }

  // Tenant isolation checkpoint always required if tenant impact
  if (input.tenant_impact) {
    checkpoints.push({
      checkpoint_id: `vc-${++checkpointId}`,
      checkpoint_type: "tenant_isolation_verification",
      description: "Verify tenant isolation preserved after change",
      priority: "required",
      target_layer: "tenant",
    });
  }

  // Regression requirements
  const regressionReqs: string[] = [];
  if (input.blast_radius_size === "large" || input.blast_radius_size === "critical") {
    regressionReqs.push("Full regression test required across affected layers");
  }
  if (input.affected_layers.includes("execution")) {
    regressionReqs.push("Runtime latency regression comparison required");
  }
  if (input.affected_layers.includes("strategy") || input.affected_layers.includes("policy")) {
    regressionReqs.push("Strategy/policy compatibility regression required");
  }

  // Compatibility checks
  const compatChecks: string[] = [];
  if (input.affected_layers.length > 2) {
    compatChecks.push("Cross-layer compatibility validation required");
  }
  compatChecks.push(`${input.proposal_type} compatibility with current ${input.target_scope} configuration`);

  // Coverage requirements
  const coverageReqs: string[] = [];
  if (input.affected_layers.includes("observability")) {
    coverageReqs.push("Observability coverage must not decrease");
  }
  coverageReqs.push("All affected components must have validation checkpoints");

  // Effort estimation
  let effort: ValidationBlueprint["estimated_validation_effort"] = "low";
  if (checkpoints.length > 10 || input.blast_radius_size === "critical") effort = "very_high";
  else if (checkpoints.length > 6 || input.blast_radius_size === "large") effort = "high";
  else if (checkpoints.length > 3) effort = "moderate";

  return {
    checkpoints,
    regression_requirements: regressionReqs,
    compatibility_checks: compatChecks,
    coverage_requirements: coverageReqs,
    estimated_validation_effort: effort,
  };
}
