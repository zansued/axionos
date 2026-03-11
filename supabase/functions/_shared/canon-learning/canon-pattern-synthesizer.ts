/**
 * Canon Pattern Synthesizer — Sprint 142
 * Detects patterns from grouped signals and proposes candidate canon entries.
 */

export interface SignalGroup {
  signature: string;
  signals: Array<{
    id: string;
    signal_type: string;
    outcome: string;
    outcome_success: boolean;
    confidence: number;
    stage_name: string;
    strategy_used?: string;
  }>;
}

export interface SynthesisResult {
  pattern_type: "failure" | "success" | "refactor" | "validation";
  pattern_signature: string;
  description: string;
  occurrence_count: number;
  success_rate: number;
  severity: string;
  affected_stages: string[];
  recommended_practice_type: string;
  confidence: number;
}

export function synthesizePatterns(groups: SignalGroup[]): SynthesisResult[] {
  const results: SynthesisResult[] = [];

  for (const group of groups) {
    if (group.signals.length < 2) continue;

    const successCount = group.signals.filter(s => s.outcome_success).length;
    const totalCount = group.signals.length;
    const successRate = Math.round((successCount / totalCount) * 100);
    const avgConfidence = Math.round(group.signals.reduce((a, s) => a + s.confidence, 0) / totalCount);
    const stages = [...new Set(group.signals.map(s => s.stage_name).filter(Boolean))];

    let patternType: SynthesisResult["pattern_type"];
    let severity: string;
    let recommendedPractice: string;

    if (successRate >= 80) {
      patternType = "success";
      severity = "info";
      recommendedPractice = "best_practice";
    } else if (successRate <= 30) {
      patternType = "failure";
      severity = successRate <= 10 ? "critical" : "high";
      recommendedPractice = "anti_pattern";
    } else {
      const hasRefactor = group.signals.some(s =>
        s.signal_type === "architecture_refactor" || s.signal_type === "code_improvement"
      );
      if (hasRefactor) {
        patternType = "refactor";
        severity = "medium";
        recommendedPractice = "implementation_pattern";
      } else {
        patternType = "validation";
        severity = "medium";
        recommendedPractice = "validation_rule";
      }
    }

    results.push({
      pattern_type: patternType,
      pattern_signature: group.signature,
      description: `${patternType} pattern detected: ${group.signature} (${totalCount} occurrences, ${successRate}% success)`,
      occurrence_count: totalCount,
      success_rate: successRate,
      severity,
      affected_stages: stages,
      recommended_practice_type: recommendedPractice,
      confidence: avgConfidence,
    });
  }

  return results;
}
