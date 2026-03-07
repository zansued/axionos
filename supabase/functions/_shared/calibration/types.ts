/**
 * Advisory Calibration Types — Sprint 20
 *
 * Defines calibration domains, signal types, and scoring interfaces.
 * SAFETY: Type definitions only. No side effects.
 */

// ─── Calibration Domains ───

export const CALIBRATION_DOMAINS = [
  "META_AGENT_PERFORMANCE",
  "PROPOSAL_USEFULNESS",
  "HISTORICAL_CONTEXT_VALUE",
  "REDUNDANCY_GUARD_EFFECTIVENESS",
  "NOVELTY_BALANCE",
  "DECISION_FOLLOW_THROUGH",
] as const;
export type CalibrationDomain = typeof CALIBRATION_DOMAINS[number];

// ─── Signal Types ───

export const CALIBRATION_SIGNAL_TYPES = [
  "UNDERPERFORMING_META_AGENT",
  "HIGH_VALUE_META_AGENT",
  "LOW_USEFULNESS_ARTIFACT_TYPE",
  "HIGH_USEFULNESS_ARTIFACT_TYPE",
  "HISTORICAL_CONTEXT_OVERWEIGHTED",
  "HISTORICAL_CONTEXT_UNDERUSED",
  "HISTORICAL_CONTEXT_HIGH_VALUE",
  "HISTORICAL_CONTEXT_LOW_VALUE",
  "REDUNDANCY_GUARD_TOO_STRICT",
  "REDUNDANCY_GUARD_TOO_WEAK",
  "NOVEL_SIGNALS_UNDERSCORED",
  "NOVEL_SIGNALS_OVERPROMOTED",
  "LOW_FOLLOW_THROUGH_PATTERN",
  "HIGH_FOLLOW_THROUGH_PATTERN",
] as const;
export type CalibrationSignalType = typeof CALIBRATION_SIGNAL_TYPES[number];

// ─── Meta-Agent Types ───

export const META_AGENT_TYPES = [
  "ARCHITECTURE_META_AGENT",
  "AGENT_ROLE_DESIGNER",
  "WORKFLOW_OPTIMIZER",
  "SYSTEM_EVOLUTION_ADVISOR",
] as const;
export type MetaAgentType = typeof META_AGENT_TYPES[number];

// ─── Artifact Types ───

export const ARTIFACT_TYPES = [
  "ADR_DRAFT",
  "ARCHITECTURE_PROPOSAL",
  "AGENT_ROLE_SPEC",
  "WORKFLOW_CHANGE_PROPOSAL",
  "IMPLEMENTATION_PLAN",
] as const;
export type ArtifactType = typeof ARTIFACT_TYPES[number];

// ─── Calibration Signal Input ───

export interface CalibrationSignalInput {
  organization_id: string;
  workspace_id?: string | null;
  calibration_domain: CalibrationDomain;
  target_component: string;
  signal_type: CalibrationSignalType;
  title: string;
  description: string;
  signal_strength: number;
  confidence_score: number;
  evidence_refs: Record<string, unknown>[];
  recommended_action: string;
  risk_of_overcorrection?: number | null;
}

// ─── Calibration Scoring Input ───

export interface CalibrationScoringInput {
  sample_size: number;
  acceptance_rate: number;
  implementation_rate: number;
  positive_outcome_rate: number;
  avg_quality_score: number;
  avg_usefulness_score: number;
  recurrence_count?: number;
  trend_direction?: "improving" | "declining" | "stable";
}

// ─── Calibration Scoring Output ───

export interface CalibrationScoringOutput {
  signal_strength: number;
  confidence_score: number;
  risk_of_overcorrection: number;
}

// ─── Agent Performance Metrics ───

export interface AgentPerformanceMetrics {
  meta_agent_type: string;
  total_recommendations: number;
  accepted: number;
  rejected: number;
  deferred: number;
  total_artifacts: number;
  artifacts_approved: number;
  artifacts_implemented: number;
  avg_quality_score: number;
  avg_usefulness_score: number;
  memory_enriched_rate: number;
  non_memory_rate: number;
}

// ─── Artifact Usefulness Metrics ───

export interface ArtifactUsefulnessMetrics {
  artifact_type: string;
  total: number;
  approved: number;
  implemented: number;
  abandoned: number;
  avg_quality: number;
  avg_usefulness: number;
  positive_outcome_count: number;
  negative_outcome_count: number;
}

// ─── Audit Events ───

export const CALIBRATION_AUDIT_EVENTS = {
  ADVISORY_CALIBRATION_SIGNAL_CREATED: "ADVISORY_CALIBRATION_SIGNAL_CREATED",
  ADVISORY_CALIBRATION_SUMMARY_CREATED: "ADVISORY_CALIBRATION_SUMMARY_CREATED",
  ADVISORY_CALIBRATION_VIEWED: "ADVISORY_CALIBRATION_VIEWED",
  ADVISORY_CALIBRATION_USED: "ADVISORY_CALIBRATION_USED",
} as const;

// ─── Summary Types ───

export const CALIBRATION_SUMMARY_TYPES = [
  "META_AGENT_CALIBRATION",
  "PROPOSAL_USEFULNESS_CALIBRATION",
  "HISTORICAL_CONTEXT_EFFECTIVENESS",
  "REDUNDANCY_NOVELTY_BALANCE",
  "FULL_CALIBRATION_REPORT",
] as const;
export type CalibrationSummaryType = typeof CALIBRATION_SUMMARY_TYPES[number];
