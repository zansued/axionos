/**
 * Decision Rights Explainer
 * Explains why authority is allowed, delegated, denied, or escalated.
 */

export interface ExplainInput {
  evaluationResult: string;
  authorityLevel: string;
  legitimacyScore: number;
  reviewRequired: boolean;
  hasContestation: boolean;
  contestationType: string;
  delegationActive: boolean;
  constitutionName: string;
  domainName: string;
  decisionType: string;
  actorRef: string;
}

export interface AuthorityExplanation {
  title: string;
  summary: string;
  details: string[];
  recommendation: string;
}

export function explainAuthority(input: ExplainInput): AuthorityExplanation {
  const details: string[] = [];

  details.push(`Domain: ${input.domainName}`);
  details.push(`Decision type: ${input.decisionType}`);
  details.push(`Actor: ${input.actorRef}`);
  details.push(`Authority level: ${input.authorityLevel}`);
  details.push(`Constitution: ${input.constitutionName || "none"}`);
  details.push(`Legitimacy score: ${input.legitimacyScore}/100`);

  if (input.delegationActive) details.push("Authority is currently delegated and active.");
  if (input.reviewRequired) details.push("Human review is required before execution.");
  if (input.hasContestation) details.push(`Contestation detected: ${input.contestationType}.`);

  let title: string;
  let summary: string;
  let recommendation: string;

  switch (input.evaluationResult) {
    case "allowed":
      title = "Authority Granted";
      summary = `${input.actorRef} has ${input.authorityLevel} authority to make this decision.`;
      recommendation = input.reviewRequired ? "Proceed with mandatory review." : "Proceed.";
      break;
    case "delegated":
      title = "Delegated Authority";
      summary = `${input.actorRef} acts under delegated authority for this decision.`;
      recommendation = "Verify delegation is still active before proceeding.";
      break;
    case "denied":
      title = "Authority Denied";
      summary = `${input.actorRef} does not have authority for this decision.`;
      recommendation = "Escalate to an authorized actor or request delegation.";
      break;
    case "escalated":
      title = "Escalation Required";
      summary = "This decision requires escalation to a higher authority.";
      recommendation = "Route to the appropriate escalation path.";
      break;
    case "contested":
      title = "Contested Authority";
      summary = "Multiple conflicting authority claims exist for this decision.";
      recommendation = "Resolve contestation before proceeding.";
      break;
    default:
      title = "Unknown";
      summary = "Authority evaluation produced an unexpected result.";
      recommendation = "Review manually.";
  }

  return { title, summary, details, recommendation };
}
