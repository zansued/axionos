/**
 * Transition Risk Detector
 * Detects transition fragility, missing backups, weak handoff structure.
 */
export interface TransitionRiskInput {
  roleName: string;
  criticalityLevel: string;
  backupExists: boolean;
  successionPlanActive: boolean;
  handoffMaturityScore: number;
  knowledgeConcentrationScore: number;
}

export interface TransitionRisk {
  roleName: string;
  riskLevel: string;
  risks: string[];
}

export function detectTransitionRisks(inputs: TransitionRiskInput[]): TransitionRisk[] {
  return inputs.map(i => {
    const risks: string[] = [];
    if (!i.backupExists && i.criticalityLevel === "critical") risks.push("Critical role without backup.");
    if (!i.successionPlanActive) risks.push("No active succession plan.");
    if (i.handoffMaturityScore < 0.3) risks.push("Handoff maturity is very low.");
    if (i.knowledgeConcentrationScore > 0.7) risks.push("Knowledge dangerously concentrated.");
    const riskLevel = risks.length >= 3 ? "critical" : risks.length >= 2 ? "high" : risks.length >= 1 ? "medium" : "low";
    return { roleName: i.roleName, riskLevel, risks };
  }).filter(r => r.risks.length > 0);
}
