/**
 * Succession Explainer
 * Explains why a role/domain is ready, fragile, concentrated, or continuity-threatening.
 */
export interface SuccessionExplainInput {
  roleName: string;
  readinessLevel: string;
  readinessScore: number;
  backupExists: boolean;
  knowledgeConcentrationScore: number;
  handoffMaturityScore: number;
  successionPlanActive: boolean;
}

export interface SuccessionExplanation {
  title: string;
  summary: string;
  details: string[];
  recommendation: string;
}

export function explainSuccession(input: SuccessionExplainInput): SuccessionExplanation {
  const details: string[] = [];
  details.push(`Readiness: ${input.readinessLevel} (${input.readinessScore}/100)`);
  details.push(`Backup: ${input.backupExists ? "designated" : "missing"}`);
  details.push(`Knowledge concentration: ${Math.round(input.knowledgeConcentrationScore * 100)}%`);
  details.push(`Handoff maturity: ${Math.round(input.handoffMaturityScore * 100)}%`);
  details.push(`Active succession plan: ${input.successionPlanActive ? "yes" : "no"}`);

  let title: string;
  let recommendation: string;
  if (input.readinessLevel === "ready") {
    title = "Succession Ready";
    recommendation = "Maintain current posture. Review periodically.";
  } else if (input.readinessLevel === "partial") {
    title = "Partial Readiness";
    recommendation = "Strengthen backup designation and handoff documentation.";
  } else {
    title = "Fragile Continuity";
    recommendation = "Urgent: designate backup, create succession plan, reduce knowledge concentration.";
  }

  return { title, summary: `${input.roleName}: ${title.toLowerCase()}.`, details, recommendation };
}
