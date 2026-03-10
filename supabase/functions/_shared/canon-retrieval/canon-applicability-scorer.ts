/**
 * canon-applicability-scorer.ts
 * Scores how applicable a canon entry is to a specific execution context.
 */

import type { ImplementationPattern } from "./implementation-pattern-library.ts";

export interface ApplicabilityContext {
  stack?: string;
  language?: string;
  framework?: string;
  problemType?: string;
  pipelineStage?: string;
  artifactType?: string;
  qualityRequirement?: string;
}

export interface ApplicabilityScore {
  canonEntryId: string;
  title: string;
  overallScore: number;
  stackMatch: number;
  problemMatch: number;
  qualityMatch: number;
  constraintSatisfaction: number;
  reasons: string[];
  cautions: string[];
}

export function scoreApplicability(
  pattern: ImplementationPattern,
  context: ApplicabilityContext
): ApplicabilityScore {
  const reasons: string[] = [];
  const cautions: string[] = [];
  let stackMatch = 0;
  let problemMatch = 0;
  let qualityMatch = 0;
  let constraintSat = 1.0;

  // Stack matching
  let stackChecks = 0;
  let stackHits = 0;
  if (context.language) {
    stackChecks++;
    if (pattern.languageTags.length === 0 || pattern.languageTags.includes(context.language)) {
      stackHits++;
      reasons.push(`Language compatible: ${context.language}`);
    } else {
      cautions.push(`Language mismatch: pattern targets ${pattern.languageTags.join(', ')}`);
    }
  }
  if (context.framework) {
    stackChecks++;
    if (pattern.frameworkTags.length === 0 || pattern.frameworkTags.includes(context.framework)) {
      stackHits++;
      reasons.push(`Framework compatible: ${context.framework}`);
    } else {
      cautions.push(`Framework mismatch: pattern targets ${pattern.frameworkTags.join(', ')}`);
    }
  }
  if (context.stack) {
    stackChecks++;
    if (pattern.stackTags.length === 0 || pattern.stackTags.includes(context.stack)) {
      stackHits++;
      reasons.push(`Stack compatible: ${context.stack}`);
    }
  }
  stackMatch = stackChecks > 0 ? stackHits / stackChecks : 0.5;

  // Problem matching
  if (context.problemType) {
    problemMatch = pattern.problemType === context.problemType ? 1.0 :
      pattern.problemType === 'general' ? 0.5 : 0.1;
    if (problemMatch >= 0.5) reasons.push(`Problem type match: ${context.problemType}`);
  } else {
    problemMatch = 0.5;
  }

  // Quality matching
  if (context.qualityRequirement) {
    const qMap: Record<string, number> = { standard: 1, high: 2, critical: 3 };
    const required = qMap[context.qualityRequirement] || 1;
    const provided = qMap[pattern.qualityLevel] || 1;
    qualityMatch = provided >= required ? 1.0 : 0.5;
    if (provided < required) cautions.push(`Pattern quality (${pattern.qualityLevel}) below requirement (${context.qualityRequirement})`);
  } else {
    qualityMatch = 0.7;
  }

  // Constraint check
  if (pattern.usageConstraints && Object.keys(pattern.usageConstraints).length > 0) {
    constraintSat = 0.8; // Penalize slightly for constrained patterns
    cautions.push('Pattern has usage constraints — review before applying');
  }

  // Anti-pattern flag
  if (pattern.antiPatternLinks.length > 0) {
    cautions.push(`${pattern.antiPatternLinks.length} related anti-patterns — review before applying`);
  }

  const overallScore = (
    stackMatch * 0.35 +
    problemMatch * 0.25 +
    qualityMatch * 0.15 +
    constraintSat * 0.1 +
    pattern.confidenceScore * 0.15
  );

  return {
    canonEntryId: pattern.canonEntryId,
    title: pattern.title,
    overallScore: Math.round(overallScore * 100) / 100,
    stackMatch: Math.round(stackMatch * 100) / 100,
    problemMatch: Math.round(problemMatch * 100) / 100,
    qualityMatch: Math.round(qualityMatch * 100) / 100,
    constraintSatisfaction: Math.round(constraintSat * 100) / 100,
    reasons,
    cautions,
  };
}

export function batchScoreApplicability(
  patterns: ImplementationPattern[],
  context: ApplicabilityContext
): ApplicabilityScore[] {
  return patterns
    .map(p => scoreApplicability(p, context))
    .sort((a, b) => b.overallScore - a.overallScore);
}
