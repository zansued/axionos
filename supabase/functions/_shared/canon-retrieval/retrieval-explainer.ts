/**
 * retrieval-explainer.ts
 * Generates human-readable explanations of retrieval decisions.
 */

import type { ImplementationPattern } from "./implementation-pattern-library.ts";
import type { ApplicabilityScore } from "./canon-applicability-scorer.ts";

export interface RetrievalExplanation {
  summary: string;
  retrievedCount: number;
  excludedCount: number;
  topPatternExplanation: string;
  selectionCriteria: string[];
  exclusionReasons: string[];
  antiPatternWarnings: string[];
  recommendations: string[];
}

export function explainRetrieval(
  retrieved: ImplementationPattern[],
  excluded: ImplementationPattern[],
  scores: ApplicabilityScore[],
  queryDescription: string
): RetrievalExplanation {
  const selectionCriteria: string[] = [];
  const exclusionReasons: string[] = [];
  const antiPatternWarnings: string[] = [];
  const recommendations: string[] = [];

  // Selection criteria from top scores
  const topScore = scores[0];
  if (topScore) {
    selectionCriteria.push(...topScore.reasons);
  }

  // Exclusion reasons
  for (const ex of excluded.slice(0, 3)) {
    if (ex.lifecycleStatus === 'deprecated') {
      exclusionReasons.push(`"${ex.title}" excluded: deprecated`);
    } else if (ex.approvalStatus !== 'approved') {
      exclusionReasons.push(`"${ex.title}" excluded: not approved (${ex.approvalStatus})`);
    } else {
      exclusionReasons.push(`"${ex.title}" excluded: low applicability score`);
    }
  }

  // Anti-pattern warnings from retrieved patterns
  for (const p of retrieved) {
    if (p.antiPatternLinks.length > 0) {
      antiPatternWarnings.push(`"${p.title}" has ${p.antiPatternLinks.length} related anti-pattern(s)`);
    }
    if (Object.keys(p.usageConstraints).length > 0) {
      antiPatternWarnings.push(`"${p.title}" has usage constraints — review before applying`);
    }
  }

  // Recommendations
  if (retrieved.length === 0) {
    recommendations.push('No approved patterns found for this context — consider creating a new canon entry');
  } else if (retrieved.every(p => p.confidenceScore < 0.6)) {
    recommendations.push('All retrieved patterns have moderate confidence — consider reviewing and strengthening canon entries');
  }

  const topExplanation = topScore
    ? `Best match: "${topScore.title}" (score: ${topScore.overallScore}, stack: ${topScore.stackMatch}, problem: ${topScore.problemMatch})`
    : 'No patterns matched the query context';

  return {
    summary: `Retrieved ${retrieved.length} pattern(s) for: ${queryDescription}. ${excluded.length} pattern(s) excluded.`,
    retrievedCount: retrieved.length,
    excludedCount: excluded.length,
    topPatternExplanation: topExplanation,
    selectionCriteria,
    exclusionReasons,
    antiPatternWarnings,
    recommendations,
  };
}
