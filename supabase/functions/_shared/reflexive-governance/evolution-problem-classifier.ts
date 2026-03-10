/**
 * Evolution Problem Classifier — Sprint 111
 * Classifies detected issues into operational, tactical, architectural, or existential.
 */

import type { ProposalType, TargetLayer } from "./evolution-proposal-builder.ts";

export interface ProblemSignal {
  signal_type: string;
  severity: string;
  source: string;
  description: string;
  affected_components: string[];
  recurrence_count: number;
}

export interface ClassificationResult {
  proposal_type: ProposalType;
  target_layer: TargetLayer;
  confidence: number;
  reasoning: string;
  is_structural: boolean;
  requires_evolution_proposal: boolean;
}

const STRUCTURAL_SIGNAL_TYPES = [
  "architecture_drift", "kernel_mutation", "governance_conflict",
  "mission_erosion", "cross_layer_failure", "topology_change",
];

export function classifyProblem(signals: ProblemSignal[]): ClassificationResult {
  if (signals.length === 0) {
    return {
      proposal_type: "operational_fix",
      target_layer: "execution",
      confidence: 0,
      reasoning: "No signals provided",
      is_structural: false,
      requires_evolution_proposal: false,
    };
  }

  const hasStructural = signals.some(s => STRUCTURAL_SIGNAL_TYPES.includes(s.signal_type));
  const maxRecurrence = Math.max(...signals.map(s => s.recurrence_count));
  const hasCritical = signals.some(s => s.severity === "critical");
  const affectedLayers = new Set(signals.flatMap(s => s.affected_components));

  let proposalType: ProposalType;
  let targetLayer: TargetLayer;
  let confidence: number;

  if (hasCritical && hasStructural && affectedLayers.size > 2) {
    proposalType = "existential_change";
    targetLayer = "cross_layer";
    confidence = 0.85;
  } else if (hasStructural || affectedLayers.size > 1) {
    proposalType = "architectural_evolution";
    targetLayer = affectedLayers.has("governance") ? "governance" : "coordination";
    confidence = 0.75;
  } else if (maxRecurrence > 3) {
    proposalType = "tactical_improvement";
    targetLayer = "execution";
    confidence = 0.7;
  } else {
    proposalType = "operational_fix";
    targetLayer = "execution";
    confidence = 0.6;
  }

  const requiresProposal = proposalType !== "operational_fix";

  return {
    proposal_type: proposalType,
    target_layer: targetLayer,
    confidence,
    reasoning: `Classified as ${proposalType} affecting ${targetLayer}. ${hasStructural ? "Structural signals detected." : ""} ${hasCritical ? "Critical severity present." : ""} Recurrence max: ${maxRecurrence}.`,
    is_structural: hasStructural,
    requires_evolution_proposal: requiresProposal,
  };
}
