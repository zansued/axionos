/**
 * Architecture Simulation Review Manager — Sprint 38
 * Manages review lifecycle for simulation outcomes.
 * Pure functions. No DB access.
 */

export type SimReviewStatus = "reviewed" | "accepted" | "rejected" | "dismissed";
export type SimOutcomeStatus = "generated" | "reviewed" | "accepted" | "rejected";

export interface SimReviewRequest {
  simulation_outcome_id: string;
  current_status: SimOutcomeStatus;
  target_status: SimReviewStatus;
  review_notes?: string;
  review_reason_codes?: string[];
  linked_changes?: Record<string, any>;
}

export interface SimReviewResult {
  allowed: boolean;
  simulation_outcome_id: string;
  new_outcome_status: SimOutcomeStatus;
  review_status: SimReviewStatus;
  rejection_reason?: string;
}

const VALID_TRANSITIONS: Record<SimOutcomeStatus, SimReviewStatus[]> = {
  generated: ["reviewed", "dismissed"],
  reviewed: ["accepted", "rejected", "dismissed"],
  accepted: [],
  rejected: [],
};

export function validateSimReviewTransition(req: SimReviewRequest): SimReviewResult {
  const validTargets = VALID_TRANSITIONS[req.current_status] || [];

  if (!validTargets.includes(req.target_status)) {
    return {
      allowed: false,
      simulation_outcome_id: req.simulation_outcome_id,
      new_outcome_status: req.current_status,
      review_status: req.target_status,
      rejection_reason: `Cannot transition from "${req.current_status}" to "${req.target_status}". Valid: ${validTargets.join(", ") || "none"}`,
    };
  }

  return {
    allowed: true,
    simulation_outcome_id: req.simulation_outcome_id,
    new_outcome_status: req.target_status as SimOutcomeStatus,
    review_status: req.target_status,
  };
}
