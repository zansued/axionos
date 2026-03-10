/**
 * Evolution Proposal Builder — Sprint 111
 * Constructs well-formed evolution proposals with defaults and validation.
 */

export type ProposalType = "operational_fix" | "tactical_improvement" | "architectural_evolution" | "existential_change";
export type ProposalStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "deferred" | "archived";
export type TargetLayer = "execution" | "coordination" | "governance" | "strategic" | "reflexive" | "canonical_knowledge" | "cross_layer";
export type ReversibilityPosture = "fully_reversible" | "partially_reversible" | "irreversible";
export type BoundednessPosture = "strictly_bounded" | "loosely_bounded" | "unbounded";

export interface EvolutionProposalInput {
  organization_id: string;
  proposal_type: ProposalType;
  target_layer: TargetLayer;
  target_scope: string;
  problem_statement: string;
  triggering_signals: Record<string, unknown>[];
  justification_summary: string;
  expected_benefit: string;
  complexity_cost: number;
  reversibility_posture: ReversibilityPosture;
  boundedness_posture: BoundednessPosture;
  proposed_by: string;
}

export interface EvolutionProposal extends EvolutionProposalInput {
  kernel_touch_risk: number;
  mission_alignment_score: number;
  legitimacy_score: number;
  status: ProposalStatus;
}

export interface BuildResult {
  valid: boolean;
  errors: string[];
  proposal: EvolutionProposal | null;
}

const KERNEL_RISK_LAYERS: TargetLayer[] = ["governance", "reflexive", "cross_layer"];

export function buildProposal(input: EvolutionProposalInput): BuildResult {
  const errors: string[] = [];

  if (!input.organization_id) errors.push("organization_id is required");
  if (!input.problem_statement || input.problem_statement.length < 10) errors.push("problem_statement must be at least 10 characters");
  if (!input.justification_summary || input.justification_summary.length < 10) errors.push("justification_summary must be at least 10 characters");
  if (!input.expected_benefit) errors.push("expected_benefit is required");
  if (!input.proposed_by) errors.push("proposed_by is required");
  if (input.complexity_cost < 0 || input.complexity_cost > 100) errors.push("complexity_cost must be 0-100");

  if (errors.length > 0) return { valid: false, errors, proposal: null };

  const kernelTouchRisk = computeKernelTouchRisk(input);

  return {
    valid: true,
    errors: [],
    proposal: {
      ...input,
      kernel_touch_risk: kernelTouchRisk,
      mission_alignment_score: 0,
      legitimacy_score: 0,
      status: "draft",
    },
  };
}

function computeKernelTouchRisk(input: EvolutionProposalInput): number {
  let risk = 0;
  if (KERNEL_RISK_LAYERS.includes(input.target_layer)) risk += 40;
  if (input.proposal_type === "existential_change") risk += 30;
  else if (input.proposal_type === "architectural_evolution") risk += 20;
  if (input.reversibility_posture === "irreversible") risk += 20;
  else if (input.reversibility_posture === "partially_reversible") risk += 10;
  if (input.boundedness_posture === "unbounded") risk += 10;
  return Math.min(risk, 100);
}
