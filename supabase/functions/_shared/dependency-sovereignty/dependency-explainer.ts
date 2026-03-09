/**
 * Dependency Explainer
 * Explains why a dependency is safe, risky, critical, concentrated, or sovereignty-threatening.
 */
export interface DependencyExplainInput {
  dependencyName: string;
  criticalityLevel: string;
  lockInRiskLevel: string;
  replacementComplexity: string;
  fallbackExists: boolean;
  relianceLinkCount: number;
  costDependencyScore: number;
  status: string;
}

export interface DependencyExplanation {
  title: string;
  summary: string;
  factors: string[];
  recommendation: string;
}

export function explainDependency(input: DependencyExplainInput): DependencyExplanation {
  const factors: string[] = [];
  factors.push(`Criticality: ${input.criticalityLevel}`);
  factors.push(`Lock-in risk: ${input.lockInRiskLevel}`);
  factors.push(`Replacement complexity: ${input.replacementComplexity}`);
  factors.push(`Fallback: ${input.fallbackExists ? "exists" : "none"}`);
  factors.push(`Dependent assets: ${input.relianceLinkCount}`);
  if (input.costDependencyScore > 0.5) factors.push(`High cost dependency (${Math.round(input.costDependencyScore * 100)}%).`);

  const isDangerous = input.criticalityLevel === "critical" && !input.fallbackExists;
  const isHighRisk = input.lockInRiskLevel === "high" || input.lockInRiskLevel === "critical";

  let title: string;
  let recommendation: string;
  if (isDangerous) {
    title = "Sovereignty Threat";
    recommendation = "Critical dependency without fallback — model exit path immediately.";
  } else if (isHighRisk) {
    title = "High Lock-In Risk";
    recommendation = "Evaluate substitution options and reduce concentration.";
  } else {
    title = "Manageable Dependency";
    recommendation = "Continue monitoring. Review during next sovereignty assessment.";
  }

  return { title, summary: `${input.dependencyName}: ${title.toLowerCase()}.`, factors, recommendation };
}
