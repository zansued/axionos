/**
 * Decision Rights Resolver
 * Resolves applicable decision rights for a given domain, actor, and decision type.
 */

export interface DecisionRight {
  id: string;
  decision_code: string;
  decision_type: string;
  authority_level: string;
  subject_type: string;
  subject_ref: string;
  scope_type: string;
  scope_ref: string;
  decision_rule_text: string;
  precedence_rank: number;
  review_required: boolean;
  revocable: boolean;
}

export interface ResolvedAuthority {
  rights: DecisionRight[];
  effectiveLevel: string;
  reviewRequired: boolean;
  precedenceWinner: DecisionRight | null;
}

export function resolveDecisionRights(
  allRights: DecisionRight[],
  domainId: string,
  actorRef: string,
  decisionType: string
): ResolvedAuthority {
  const matching = allRights
    .filter(r =>
      (r.subject_ref === actorRef || r.subject_ref === "*") &&
      (r.decision_type === decisionType || r.decision_type === "*")
    )
    .sort((a, b) => b.precedence_rank - a.precedence_rank);

  if (matching.length === 0) {
    return {
      rights: [],
      effectiveLevel: "prohibited",
      reviewRequired: false,
      precedenceWinner: null,
    };
  }

  const winner = matching[0];
  return {
    rights: matching,
    effectiveLevel: winner.authority_level,
    reviewRequired: winner.review_required,
    precedenceWinner: winner,
  };
}
