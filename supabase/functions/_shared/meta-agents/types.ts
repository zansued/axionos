/**
 * Meta-Agent Types — Sprint 13
 * Defines taxonomy, recommendation types, and shared interfaces.
 */

export const META_AGENT_TYPES = [
  "ARCHITECTURE_META_AGENT",
  "AGENT_ROLE_DESIGNER",
  "WORKFLOW_OPTIMIZER",
  "SYSTEM_EVOLUTION_ADVISOR",
] as const;

export type MetaAgentType = typeof META_AGENT_TYPES[number];

export const RECOMMENDATION_TYPES = [
  // Architecture
  "PIPELINE_OPTIMIZATION",
  "STAGE_REORDERING_SUGGESTION",
  "STAGE_SPLIT_OR_MERGE",
  // Agent Role
  "NEW_AGENT_ROLE",
  "AGENT_SPECIALIZATION",
  "AGENT_DEPRECATION",
  // Workflow
  "WORKFLOW_PARALLELIZATION",
  "STEP_ELIMINATION",
  "STEP_REORDERING",
  // System Evolution
  "TECHNICAL_DEBT_ALERT",
  "ARCHITECTURE_CHANGE_PROPOSAL",
  "SYSTEM_EVOLUTION_REPORT",
] as const;

export type RecommendationType = typeof RECOMMENDATION_TYPES[number];

export const RECOMMENDATION_STATUSES = [
  "pending",
  "reviewed",
  "accepted",
  "rejected",
  "deferred",
] as const;

export type RecommendationStatus = typeof RECOMMENDATION_STATUSES[number];

export type ImpactLevel = "low" | "medium" | "high" | "critical";

export interface MetaRecommendation {
  meta_agent_type: MetaAgentType;
  recommendation_type: RecommendationType;
  target_component: string;
  title: string;
  description: string;
  confidence_score: number;
  impact_score: number;
  priority_score: number;
  supporting_evidence: Record<string, unknown>[];
  source_metrics: Record<string, unknown>;
  source_record_ids: string[];
  recommendation_signature: string;
}

export const META_AUDIT_EVENTS = {
  META_AGENT_RUN: "META_AGENT_RUN",
  META_RECOMMENDATION_CREATED: "META_RECOMMENDATION_CREATED",
  META_RECOMMENDATION_REVIEWED: "META_RECOMMENDATION_REVIEWED",
  META_RECOMMENDATION_ACCEPTED: "META_RECOMMENDATION_ACCEPTED",
  META_RECOMMENDATION_REJECTED: "META_RECOMMENDATION_REJECTED",
  META_RECOMMENDATION_DEFERRED: "META_RECOMMENDATION_DEFERRED",
} as const;
