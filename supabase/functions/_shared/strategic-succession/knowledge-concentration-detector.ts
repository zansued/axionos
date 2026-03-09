/**
 * Knowledge Concentration Detector
 * Detects dangerous concentration of tacit or explicit knowledge.
 */
export interface ConcentrationInput {
  roleId: string;
  roleName: string;
  knowledgeConcentrationScore: number;
  backupExists: boolean;
  handoffMaturityScore: number;
  criticalityLevel: string;
}

export interface ConcentrationRisk {
  roleId: string;
  roleName: string;
  riskLevel: string;
  factors: string[];
}

export function detectKnowledgeConcentration(inputs: ConcentrationInput[]): ConcentrationRisk[] {
  return inputs
    .filter(i => i.knowledgeConcentrationScore > 0.6 || (!i.backupExists && i.criticalityLevel === "critical"))
    .map(i => {
      const factors: string[] = [];
      if (i.knowledgeConcentrationScore > 0.8) factors.push("Extremely high knowledge concentration.");
      else if (i.knowledgeConcentrationScore > 0.6) factors.push("High knowledge concentration.");
      if (!i.backupExists) factors.push("No backup designated.");
      if (i.handoffMaturityScore < 0.3) factors.push("Handoff maturity is very low.");
      const riskLevel = i.knowledgeConcentrationScore > 0.8 && !i.backupExists ? "critical" :
        i.knowledgeConcentrationScore > 0.6 ? "high" : "medium";
      return { roleId: i.roleId, roleName: i.roleName, riskLevel, factors };
    });
}
