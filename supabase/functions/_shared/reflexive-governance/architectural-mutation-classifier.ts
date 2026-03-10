/**
 * Architectural Mutation Classifier — Sprint 112
 * Classifies mutations by structural impact level.
 */

export type MutationType = "parameter_level" | "workflow_level" | "component_level" | "boundary_level" | "architecture_level";
export type MutationApprovalStatus = "pending_analysis" | "analyzed" | "under_review" | "approved" | "rejected" | "blocked" | "archived";

export interface MutationClassificationInput {
  affected_layers: string[];
  changes_topology: boolean;
  changes_governance: boolean;
  changes_contracts: boolean;
  changes_boundaries: boolean;
  estimated_components_affected: number;
  estimated_tables_changed: number;
}

export interface MutationClassification {
  mutation_type: MutationType;
  confidence: number;
  reasoning: string;
  requires_extraordinary_review: boolean;
}

export function classifyMutation(input: MutationClassificationInput): MutationClassification {
  if (input.changes_topology || input.changes_governance || input.changes_contracts) {
    return {
      mutation_type: "architecture_level",
      confidence: 0.9,
      reasoning: "Changes affect core system topology, governance rules, or execution contracts.",
      requires_extraordinary_review: true,
    };
  }

  if (input.changes_boundaries || input.affected_layers.length > 2) {
    return {
      mutation_type: "boundary_level",
      confidence: 0.85,
      reasoning: `Changes cross ${input.affected_layers.length} layers or modify system boundaries.`,
      requires_extraordinary_review: true,
    };
  }

  if (input.estimated_components_affected > 5 || input.affected_layers.length > 1) {
    return {
      mutation_type: "component_level",
      confidence: 0.8,
      reasoning: `Affects ${input.estimated_components_affected} components across ${input.affected_layers.length} layers.`,
      requires_extraordinary_review: false,
    };
  }

  if (input.estimated_tables_changed > 0 || input.estimated_components_affected > 2) {
    return {
      mutation_type: "workflow_level",
      confidence: 0.75,
      reasoning: "Changes affect workflow-level components or data schema.",
      requires_extraordinary_review: false,
    };
  }

  return {
    mutation_type: "parameter_level",
    confidence: 0.7,
    reasoning: "Changes are limited to parameter adjustments within existing components.",
    requires_extraordinary_review: false,
  };
}
