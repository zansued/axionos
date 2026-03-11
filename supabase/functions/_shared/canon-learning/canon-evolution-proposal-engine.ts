/**
 * Canon Evolution Proposal Engine — Sprint 142
 * Generates structured evolution proposals from learning candidates.
 * Proposals are advisory only — never direct canon insertion.
 */

export interface EvolutionProposalInput {
  candidate_id: string;
  candidate_title: string;
  candidate_summary: string;
  proposed_practice_type: string;
  proposed_domain: string;
  confidence_score: number;
  signal_count: number;
  pattern_type: string;
  affected_stages: string[];
}

export interface EvolutionProposal {
  proposal_type: string;
  urgency: string;
  recommended_action: string;
  entry_draft: {
    title: string;
    summary: string;
    practice_type: string;
    domain: string;
    confidence_score: number;
    source_lineage: string;
  };
  governance_notes: string[];
}

export function generateEvolutionProposal(input: EvolutionProposalInput): EvolutionProposal {
  const urgency = determineUrgency(input);
  const govNotes: string[] = [
    "This proposal was generated from operational learning — it requires steward review before canon entry.",
    `Based on ${input.signal_count} signals with ${input.confidence_score}% confidence.`,
  ];

  if (input.confidence_score < 50) {
    govNotes.push("Low confidence — consider gathering more evidence before promotion.");
  }
  if (input.pattern_type === "failure") {
    govNotes.push("Derived from failure patterns — consider framing as anti-pattern guidance.");
  }

  let recommendedAction: string;
  if (input.confidence_score >= 70 && input.signal_count >= 5) {
    recommendedAction = "recommend_review";
  } else if (input.confidence_score >= 40) {
    recommendedAction = "queue_for_observation";
  } else {
    recommendedAction = "defer_pending_evidence";
  }

  return {
    proposal_type: `learning_${input.pattern_type}`,
    urgency,
    recommended_action: recommendedAction,
    entry_draft: {
      title: input.candidate_title,
      summary: input.candidate_summary,
      practice_type: input.proposed_practice_type,
      domain: input.proposed_domain,
      confidence_score: input.confidence_score,
      source_lineage: `learning_candidate::${input.candidate_id}`,
    },
    governance_notes: govNotes,
  };
}

function determineUrgency(input: EvolutionProposalInput): string {
  if (input.pattern_type === "failure" && input.signal_count >= 10) return "high";
  if (input.confidence_score >= 80 && input.signal_count >= 5) return "medium";
  return "low";
}
