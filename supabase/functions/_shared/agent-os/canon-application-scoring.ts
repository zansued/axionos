/**
 * Canon Application Scoring — Sprint 141
 *
 * Measures the quality and effectiveness of Canon usage during real execution.
 * Distinguishes between usage (consumed) and usefulness (helped).
 *
 * Rule-based scoring, explicit, auditable.
 * No ML — deterministic evaluation from execution signals.
 */

import type { CanonConsumptionReport, CanonConsumptionTrace, CanonKnowledgePacket } from "./canon-orchestrator-integration.ts";

// ── Quality Model ──

export type ApplicationQualityLevel = "high" | "medium" | "low" | "negative" | "unknown";
export type SuccessCorrelation = "positive" | "neutral" | "negative" | "unknown";
export type CanonApplicationUsageMode = "ignored" | "referenced" | "applied" | "misapplied";

export interface CanonApplicationScore {
  canon_application_id: string;
  run_id: string;
  initiative_id?: string;
  stage: string;
  agent_id: string;
  canon_packet_ids_available: string[];
  canon_packet_ids_used: string[];
  usage_mode: CanonApplicationUsageMode;
  application_quality: ApplicationQualityLevel;
  success_correlation: SuccessCorrelation;
  quality_score: number; // 0..1
  explanation: string;
  scoring_factors: ScoringFactor[];
  created_at: string;
}

export interface ScoringFactor {
  factor: string;
  weight: number;
  value: number; // -1..1
  explanation: string;
}

// ── Stage Run Summary ──

export interface CanonApplicationStageSummary {
  run_id: string;
  stage: string;
  canon_available_count: number;
  canon_used_count: number;
  canon_applied_count: number;
  canon_ignored_count: number;
  quality_distribution: Record<ApplicationQualityLevel, number>;
  strongest_useful_packet_id: string | null;
  ignored_recommended_packet_ids: string[];
  application_quality_score: number; // 0..1
  aggregated_correlation: SuccessCorrelation;
  learning_signals: CanonLearningSignal[];
  timestamp: string;
}

// ── Learning Signals ──

export type LearningSignalType =
  | "high_value_pattern"
  | "low_value_pattern"
  | "likely_misapplied"
  | "likely_stale"
  | "ignored_but_correct"
  | "repeated_low_quality"
  | "anti_pattern_violation"
  | "strong_positive_correlation";

export interface CanonLearningSignal {
  signal_type: LearningSignalType;
  canon_entry_id: string;
  stage: string;
  confidence: number; // 0..1
  explanation: string;
  recommended_action?: string;
}

// ── Execution Context for Scoring ──

export interface ExecutionOutcomeSignals {
  execution_succeeded: boolean;
  retries_needed: number;
  repair_triggered: boolean;
  stage_passed_cleanly: boolean;
  anti_pattern_violated: boolean;
  error_count: number;
}

// ── Stage-Aware Practice Type Map ──

const STAGE_EXPECTED_PRACTICE_TYPES: Record<string, string[]> = {
  perception: ["playbook", "research_pattern", "validation_guidance", "methodology_guideline"],
  design: ["architecture_pattern", "template", "convention", "infrastructure_pattern", "best_practice"],
  build: ["implementation_pattern", "code_convention", "template", "checklist"],
  validation: ["validation_rule", "checklist", "anti_pattern", "runtime_guardrail"],
  evolution: ["recovery_pattern", "error_convention", "troubleshooting_rule", "deployment_rule"],
};

// ── Core Scoring Functions ──

/**
 * Score a single Canon application for quality and effectiveness.
 */
export function scoreCanonApplication(
  agentId: string,
  stage: string,
  runId: string,
  consumption: CanonConsumptionReport,
  packets: CanonKnowledgePacket[],
  outcome: ExecutionOutcomeSignals,
  initiativeId?: string,
): CanonApplicationScore {
  const factors: ScoringFactor[] = [];
  const usedIds = consumption.canon_packet_ids_used;
  const availableIds = consumption.canon_packet_ids_available;

  // Determine usage mode
  let usageMode: CanonApplicationUsageMode = "ignored";
  if (consumption.canon_usage_mode === "applied") usageMode = "applied";
  else if (consumption.canon_usage_mode === "referenced") usageMode = "referenced";
  else if (consumption.canon_usage_mode === "rejected") usageMode = "ignored";

  // Factor 1: Execution success
  const successValue = outcome.execution_succeeded ? 1.0 : -0.5;
  factors.push({
    factor: "execution_success",
    weight: 0.30,
    value: successValue,
    explanation: outcome.execution_succeeded
      ? "Execution succeeded"
      : "Execution failed",
  });

  // Factor 2: Clean pass (no retries/repair)
  const cleanValue = outcome.stage_passed_cleanly ? 1.0
    : outcome.retries_needed > 0 ? -0.3
    : outcome.repair_triggered ? -0.6
    : 0;
  factors.push({
    factor: "clean_execution",
    weight: 0.20,
    value: cleanValue,
    explanation: outcome.stage_passed_cleanly
      ? "Stage passed cleanly without retries"
      : outcome.repair_triggered
        ? "Repair was triggered"
        : `${outcome.retries_needed} retries needed`,
  });

  // Factor 3: Stage-category match
  const expectedTypes = STAGE_EXPECTED_PRACTICE_TYPES[stage] || [];
  const usedPackets = packets.filter((p) => usedIds.includes(p.canon_entry_id));
  const matchingPackets = usedPackets.filter((p) =>
    expectedTypes.includes(p.practice_type),
  );
  const categoryMatchRatio = usedPackets.length > 0
    ? matchingPackets.length / usedPackets.length
    : 0;
  const categoryValue = usedPackets.length === 0 ? 0 : categoryMatchRatio * 2 - 1; // -1..1
  factors.push({
    factor: "stage_category_match",
    weight: 0.20,
    value: categoryValue,
    explanation: usedPackets.length === 0
      ? "No packets used — cannot evaluate category match"
      : `${matchingPackets.length}/${usedPackets.length} used packets match stage-expected types`,
  });

  // Factor 4: Anti-pattern adherence
  const antiPatternPackets = usedPackets.filter((p) => p.anti_pattern_flag);
  let antiPatternValue = 0;
  if (antiPatternPackets.length > 0 && stage === "validation") {
    antiPatternValue = 0.5; // good: anti-patterns used in validation
  } else if (antiPatternPackets.length > 0) {
    antiPatternValue = -0.5; // bad: anti-patterns applied outside validation
    if (outcome.anti_pattern_violated) {
      usageMode = "misapplied";
      antiPatternValue = -1.0;
    }
  }
  factors.push({
    factor: "anti_pattern_adherence",
    weight: 0.15,
    value: antiPatternValue,
    explanation: antiPatternPackets.length === 0
      ? "No anti-pattern packets used"
      : stage === "validation"
        ? "Anti-pattern guidance correctly used in validation"
        : outcome.anti_pattern_violated
          ? "Anti-pattern was violated — misapplication detected"
          : "Anti-pattern packets applied outside validation stage",
  });

  // Factor 5: Usage depth (applied > referenced > ignored)
  const depthValue = usageMode === "applied" ? 1.0
    : usageMode === "referenced" ? 0.4
    : usageMode === "misapplied" ? -0.8
    : -0.2;
  factors.push({
    factor: "usage_depth",
    weight: 0.15,
    value: depthValue,
    explanation: `Usage mode: ${usageMode}`,
  });

  // Compute quality score
  const qualityScore = Math.max(0, Math.min(1,
    factors.reduce((sum, f) => sum + f.weight * ((f.value + 1) / 2), 0),
  ));

  // Determine quality level
  const applicationQuality = qualityScore >= 0.75 ? "high"
    : qualityScore >= 0.5 ? "medium"
    : qualityScore >= 0.25 ? "low"
    : usageMode === "misapplied" ? "negative"
    : availableIds.length === 0 ? "unknown"
    : "low";

  // Determine success correlation
  let successCorrelation: SuccessCorrelation = "unknown";
  if (availableIds.length === 0 || usageMode === "ignored") {
    successCorrelation = "unknown";
  } else if (outcome.execution_succeeded && usageMode === "applied") {
    successCorrelation = "positive";
  } else if (!outcome.execution_succeeded && usageMode === "applied") {
    successCorrelation = "negative";
  } else {
    successCorrelation = "neutral";
  }

  // Build explanation
  const explanation = buildQualityExplanation(
    usageMode, applicationQuality, successCorrelation, factors,
  );

  return {
    canon_application_id: `cap_${runId}_${stage}_${agentId}`.substring(0, 64),
    run_id: runId,
    initiative_id: initiativeId,
    stage,
    agent_id: agentId,
    canon_packet_ids_available: availableIds,
    canon_packet_ids_used: usedIds,
    usage_mode: usageMode,
    application_quality: applicationQuality,
    success_correlation: successCorrelation,
    quality_score: Math.round(qualityScore * 100) / 100,
    explanation,
    scoring_factors: factors,
    created_at: new Date().toISOString(),
  };
}

/**
 * Build a stage-level summary of Canon application quality.
 */
export function buildCanonApplicationStageSummary(
  runId: string,
  stage: string,
  scores: CanonApplicationScore[],
  availablePackets: CanonKnowledgePacket[],
  consumptionTrace: CanonConsumptionTrace,
): CanonApplicationStageSummary {
  const distribution: Record<ApplicationQualityLevel, number> = {
    high: 0, medium: 0, low: 0, negative: 0, unknown: 0,
  };
  for (const s of scores) {
    distribution[s.application_quality]++;
  }

  const allUsedIds = [...new Set(scores.flatMap((s) => s.canon_packet_ids_used))];
  const appliedScores = scores.filter((s) => s.usage_mode === "applied");
  const ignoredIds = consumptionTrace.total_packets_ignored > 0
    ? availablePackets
        .filter((p) => !allUsedIds.includes(p.canon_entry_id))
        .filter((p) => p.confidence >= 0.6) // only flag high-confidence ignored
        .map((p) => p.canon_entry_id)
    : [];

  // Find strongest useful packet
  let strongestId: string | null = null;
  let strongestScore = 0;
  for (const s of scores) {
    if (s.quality_score > strongestScore && s.canon_packet_ids_used.length > 0) {
      strongestScore = s.quality_score;
      strongestId = s.canon_packet_ids_used[0] || null;
    }
  }

  // Aggregate quality score
  const avgQuality = scores.length > 0
    ? scores.reduce((sum, s) => sum + s.quality_score, 0) / scores.length
    : 0;

  // Aggregate correlation
  const correlations = scores.map((s) => s.success_correlation);
  const aggregatedCorrelation: SuccessCorrelation =
    correlations.some((c) => c === "positive") ? "positive"
    : correlations.some((c) => c === "negative") ? "negative"
    : correlations.some((c) => c === "neutral") ? "neutral"
    : "unknown";

  // Generate learning signals
  const signals = generateLearningSignals(scores, availablePackets, stage, consumptionTrace);

  return {
    run_id: runId,
    stage,
    canon_available_count: availablePackets.length,
    canon_used_count: allUsedIds.length,
    canon_applied_count: appliedScores.length,
    canon_ignored_count: consumptionTrace.total_packets_ignored,
    quality_distribution: distribution,
    strongest_useful_packet_id: strongestId,
    ignored_recommended_packet_ids: ignoredIds,
    application_quality_score: Math.round(avgQuality * 100) / 100,
    aggregated_correlation: aggregatedCorrelation,
    learning_signals: signals,
    timestamp: new Date().toISOString(),
  };
}

// ── Learning Signal Generation ──

function generateLearningSignals(
  scores: CanonApplicationScore[],
  availablePackets: CanonKnowledgePacket[],
  stage: string,
  consumptionTrace: CanonConsumptionTrace,
): CanonLearningSignal[] {
  const signals: CanonLearningSignal[] = [];

  for (const score of scores) {
    for (const packetId of score.canon_packet_ids_used) {
      const packet = availablePackets.find((p) => p.canon_entry_id === packetId);
      if (!packet) continue;

      // High-value pattern: applied + high quality + positive correlation
      if (
        score.usage_mode === "applied" &&
        score.application_quality === "high" &&
        score.success_correlation === "positive"
      ) {
        signals.push({
          signal_type: "high_value_pattern",
          canon_entry_id: packetId,
          stage,
          confidence: score.quality_score,
          explanation: `Pattern "${packet.title}" applied with high quality and positive outcome`,
          recommended_action: "Consider promoting confidence score",
        });
      }

      // Strong positive correlation
      if (score.success_correlation === "positive" && score.quality_score >= 0.7) {
        signals.push({
          signal_type: "strong_positive_correlation",
          canon_entry_id: packetId,
          stage,
          confidence: score.quality_score,
          explanation: `Strong positive correlation between "${packet.title}" usage and execution success`,
        });
      }

      // Low-value pattern: applied but low quality or negative correlation
      if (
        score.usage_mode === "applied" &&
        (score.application_quality === "low" || score.success_correlation === "negative")
      ) {
        signals.push({
          signal_type: "low_value_pattern",
          canon_entry_id: packetId,
          stage,
          confidence: 0.5,
          explanation: `Pattern "${packet.title}" applied but produced ${score.application_quality} quality / ${score.success_correlation} correlation`,
          recommended_action: "Review pattern for staleness or scope mismatch",
        });
      }

      // Misapplied pattern
      if (score.usage_mode === "misapplied") {
        signals.push({
          signal_type: "likely_misapplied",
          canon_entry_id: packetId,
          stage,
          confidence: 0.7,
          explanation: `Pattern "${packet.title}" was misapplied in stage=${stage}`,
          recommended_action: "Add guardrails or scope restrictions",
        });
      }

      // Anti-pattern violation
      if (packet.anti_pattern_flag && stage !== "validation") {
        signals.push({
          signal_type: "anti_pattern_violation",
          canon_entry_id: packetId,
          stage,
          confidence: 0.8,
          explanation: `Anti-pattern "${packet.title}" was used outside validation stage`,
          recommended_action: "Restrict anti-pattern usage to validation contexts",
        });
      }
    }
  }

  // Ignored but correct: high-confidence packets that were ignored while execution failed
  const allUsedIds = new Set(scores.flatMap((s) => s.canon_packet_ids_used));
  const anyFailed = scores.some((s) => s.success_correlation === "negative");
  if (anyFailed) {
    for (const packet of availablePackets) {
      if (!allUsedIds.has(packet.canon_entry_id) && packet.confidence >= 0.7) {
        const expectedTypes = STAGE_EXPECTED_PRACTICE_TYPES[stage] || [];
        if (expectedTypes.includes(packet.practice_type)) {
          signals.push({
            signal_type: "ignored_but_correct",
            canon_entry_id: packet.canon_entry_id,
            stage,
            confidence: packet.confidence,
            explanation: `High-confidence pattern "${packet.title}" (${packet.practice_type}) was ignored despite matching stage and execution failure`,
            recommended_action: "Consider making this pattern more prominent in retrieval",
          });
        }
      }
    }
  }

  return signals;
}

// ── Helpers ──

function buildQualityExplanation(
  usageMode: CanonApplicationUsageMode,
  quality: ApplicationQualityLevel,
  correlation: SuccessCorrelation,
  factors: ScoringFactor[],
): string {
  const topFactor = factors.reduce((best, f) =>
    Math.abs(f.weight * f.value) > Math.abs(best.weight * best.value) ? f : best,
  );

  if (usageMode === "ignored") {
    return `Canon was available but ignored. Quality assessment: ${quality}. ` +
      `Primary factor: ${topFactor.factor} (${topFactor.explanation})`;
  }

  if (usageMode === "misapplied") {
    return `Canon was misapplied. Quality: ${quality}, correlation: ${correlation}. ` +
      `Primary issue: ${topFactor.factor} (${topFactor.explanation})`;
  }

  return `Canon ${usageMode}. Quality: ${quality}, correlation: ${correlation}. ` +
    `Primary factor: ${topFactor.factor} (${topFactor.explanation})`;
}
