/**
 * Governance Mentor Mode — Types
 *
 * Decision-support layer for platform admins and reviewers.
 * All recommendations are advisory-only — no autonomous approval or execution.
 */

export type RiskLevel = "low" | "medium" | "high";

export type BlastRadius = "local" | "tenant" | "platform";

export type RollbackPosture = "clear" | "partial" | "complex";

export type MentorRecommendation =
  | "approve"
  | "approve_with_caution"
  | "defer"
  | "reject"
  | "needs_evidence"
  | "send_to_benchmark"
  | "restrict_scope";

export interface TradeOff {
  label: { pt: string; en: string };
  sideA: { pt: string; en: string };
  sideB: { pt: string; en: string };
}

export interface GovernanceMentorContent {
  /** Must match PageGuidanceContract.key */
  key: string;
  /** Type of governance decision */
  decisionType: { pt: string; en: string };
  /** Short summary of what is being reviewed */
  summary: { pt: string; en: string };
  /** Why this review matters now */
  whyNow: { pt: string; en: string };
  /** Risk assessment */
  riskLevel: RiskLevel;
  /** Scope of potential impact */
  blastRadius: BlastRadius;
  /** Recovery posture */
  rollbackPosture: RollbackPosture;
  /** Advisory recommendation */
  recommendation: MentorRecommendation;
  /** Reason for the recommendation */
  recommendationReason: { pt: string; en: string };
  /** 0–1 confidence score */
  confidence: number;
  /** What remains uncertain */
  uncertainties: { pt: string; en: string }[];
  /** Trade-off pairs */
  tradeoffs?: TradeOff[];
  /** Contextual action shortcuts */
  suggestedActions?: {
    label: { pt: string; en: string };
    route?: string;
    icon?: string;
  }[];
}
