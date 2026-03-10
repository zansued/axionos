/**
 * Canon Trial Manager — Sprint 118
 * Manages bounded trials for canon change proposals.
 */

export interface TrialConfig {
  proposal_id: string;
  candidate_id?: string;
  trial_scope: string;
  trial_duration_days: number;
  success_criteria: string;
}

export interface TrialBuildResult {
  valid: boolean;
  errors: string[];
  trial: Record<string, unknown> | null;
}

export function buildTrial(config: TrialConfig): TrialBuildResult {
  const errors: string[] = [];

  if (!config.proposal_id) errors.push("proposal_id is required");
  if (!config.trial_scope) errors.push("trial_scope is required");
  if (config.trial_duration_days < 1 || config.trial_duration_days > 90) {
    errors.push("trial_duration_days must be 1-90");
  }
  if (!config.success_criteria) errors.push("success_criteria is required");

  if (errors.length > 0) return { valid: false, errors, trial: null };

  return {
    valid: true,
    errors: [],
    trial: {
      proposal_id: config.proposal_id,
      candidate_id: config.candidate_id || null,
      trial_scope: config.trial_scope,
      trial_duration_days: config.trial_duration_days,
      success_criteria: config.success_criteria,
      status: "planned",
      started_at: null,
      ended_at: null,
      outcome_summary: "",
      outcome_metrics: {},
    },
  };
}

export type TrialStatus = "planned" | "running" | "completed" | "aborted";

const TRIAL_TRANSITIONS: Record<TrialStatus, TrialStatus[]> = {
  planned: ["running", "aborted"],
  running: ["completed", "aborted"],
  completed: [],
  aborted: [],
};

export function validateTrialTransition(from: TrialStatus, to: TrialStatus): boolean {
  return TRIAL_TRANSITIONS[from]?.includes(to) || false;
}
