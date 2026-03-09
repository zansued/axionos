/**
 * Lock-In Risk Assessor
 * Evaluates lock-in exposure, replacement friction, and dependency concentration.
 */
export interface LockInInput {
  lockInRiskLevel: string;
  replacementComplexity: string;
  fallbackExists: boolean;
  costDependencyScore: number;
  relianceLinkCount: number;
}

export interface LockInAssessment {
  lockInScore: number; // 0–100
  level: string;
  factors: string[];
}

const RISK_WEIGHTS: Record<string, number> = { critical: 40, high: 30, medium: 15, low: 5 };
const COMPLEXITY_WEIGHTS: Record<string, number> = { extreme: 30, high: 25, medium: 15, low: 5 };

export function assessLockIn(input: LockInInput): LockInAssessment {
  let score = 0;
  const factors: string[] = [];
  score += RISK_WEIGHTS[input.lockInRiskLevel] ?? 10;
  score += COMPLEXITY_WEIGHTS[input.replacementComplexity] ?? 10;
  if (!input.fallbackExists) { score += 15; factors.push("No fallback exists."); }
  if (input.costDependencyScore > 0.7) { score += 10; factors.push("High cost dependency."); }
  if (input.relianceLinkCount > 5) { score += 5; factors.push(`${input.relianceLinkCount} assets depend on this.`); }
  const level = score >= 70 ? "critical" : score >= 45 ? "high" : score >= 25 ? "medium" : "low";
  return { lockInScore: Math.min(score, 100), level, factors };
}
