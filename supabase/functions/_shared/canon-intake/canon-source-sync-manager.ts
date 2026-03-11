/**
 * Canon Source Sync Manager — Sprint 139
 * Manages sync run lifecycle and status transitions.
 */

export interface SyncRunInput {
  source_id: string;
  triggered_by: string;
}

export interface SyncRunResult {
  valid: boolean;
  errors: string[];
  record: Record<string, unknown> | null;
}

export interface SyncRunCompletion {
  candidates_found: number;
  candidates_accepted: number;
  candidates_rejected: number;
  sync_notes: string;
}

export function initiateSyncRun(input: SyncRunInput): SyncRunResult {
  const errors: string[] = [];
  if (!input.source_id) errors.push("source_id is required");
  if (!input.triggered_by) errors.push("triggered_by is required");

  if (errors.length > 0) return { valid: false, errors, record: null };

  return {
    valid: true,
    errors: [],
    record: {
      source_id: input.source_id,
      sync_status: "in_progress",
      candidates_found: 0,
      candidates_accepted: 0,
      candidates_rejected: 0,
      sync_notes: "",
      started_at: new Date().toISOString(),
      triggered_by: input.triggered_by,
    },
  };
}

export function completeSyncRun(completion: SyncRunCompletion): Record<string, unknown> {
  return {
    sync_status: completion.candidates_found > 0 ? "completed" : "completed_empty",
    candidates_found: completion.candidates_found,
    candidates_accepted: completion.candidates_accepted,
    candidates_rejected: completion.candidates_rejected,
    sync_notes: completion.sync_notes,
    completed_at: new Date().toISOString(),
  };
}
