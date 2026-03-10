/**
 * Evolution Decision Explainer — Sprint 111
 * Generates human-readable explanations for proposal governance decisions.
 */

export interface ExplainerInput {
  proposal_type: string;
  target_layer: string;
  target_scope: string;
  status: string;
  legitimacy_score: number;
  legitimacy_classification: string;
  kernel_touch_risk: number;
  reversibility_posture: string;
  boundedness_posture: string;
  mission_alignment_score: number;
  evidence_count: number;
  warnings: string[];
  blockers: string[];
}

export interface ProposalExplanation {
  title: string;
  summary: string;
  governance_verdict: string;
  risk_assessment: string;
  details: string[];
  recommendation: string;
}

export function explainProposal(input: ExplainerInput): ProposalExplanation {
  const details: string[] = [];

  details.push(`Type: ${input.proposal_type}`);
  details.push(`Target: ${input.target_layer} / ${input.target_scope}`);
  details.push(`Status: ${input.status}`);
  details.push(`Legitimacy: ${input.legitimacy_score}/100 (${input.legitimacy_classification})`);
  details.push(`Kernel touch risk: ${input.kernel_touch_risk}/100`);
  details.push(`Reversibility: ${input.reversibility_posture}`);
  details.push(`Boundedness: ${input.boundedness_posture}`);
  details.push(`Evidence entries: ${input.evidence_count}`);

  if (input.warnings.length > 0) details.push(`Warnings: ${input.warnings.join("; ")}`);
  if (input.blockers.length > 0) details.push(`Blockers: ${input.blockers.join("; ")}`);

  let title: string;
  let summary: string;
  let verdict: string;
  let recommendation: string;

  if (input.legitimacy_classification === "healthy_evolution") {
    title = "Healthy Evolution Proposal";
    summary = "This proposal represents a well-justified, bounded system improvement.";
    verdict = "Governance-positive. Proceed with review.";
    recommendation = input.kernel_touch_risk > 40
      ? "Recommend enhanced review due to kernel proximity."
      : "Standard governance review sufficient.";
  } else if (input.legitimacy_classification === "cautious_improvement") {
    title = "Cautious Improvement Proposal";
    summary = "This proposal has reasonable justification but requires careful evaluation.";
    verdict = "Governance-neutral. Additional scrutiny recommended.";
    recommendation = "Request additional evidence or reduce scope before approval.";
  } else if (input.legitimacy_classification === "overreaction") {
    title = "Potential Overreaction";
    summary = "This proposal may be a disproportionate response to the detected problem.";
    verdict = "Governance-cautious. Risk of unnecessary complexity.";
    recommendation = "Consider whether an operational fix would suffice.";
  } else if (input.legitimacy_classification === "duplication_risk") {
    title = "Duplication Risk";
    summary = "A similar proposal or solution may already exist.";
    verdict = "Governance-warning. Check for existing solutions.";
    recommendation = "Search the implementation canon for existing patterns before proceeding.";
  } else {
    title = "Complexity Inflation Risk";
    summary = "This proposal introduces complexity without proportional benefit.";
    verdict = "Governance-negative. Not recommended without major revision.";
    recommendation = "Revise scope, add evidence, or reconsider necessity.";
  }

  const riskAssessment = input.kernel_touch_risk > 60
    ? "High kernel touch risk — this change operates near system foundations."
    : input.kernel_touch_risk > 30
    ? "Moderate kernel proximity — bounded impact expected."
    : "Low kernel risk — change is well-isolated.";

  return { title, summary, governance_verdict: verdict, risk_assessment: riskAssessment, details, recommendation };
}
