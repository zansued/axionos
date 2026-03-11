/**
 * Canon Supersession Manager — Sprint 140
 * Manages entry supersession relationships and lineage.
 */

export interface SupersessionInput {
  predecessor_id: string;
  successor_id: string;
  reason: string;
  superseded_by: string;
}

export interface SupersessionResult {
  valid: boolean;
  errors: string[];
  record: Record<string, unknown> | null;
}

export function buildSupersession(input: SupersessionInput): SupersessionResult {
  const errors: string[] = [];

  if (!input.predecessor_id) errors.push("predecessor_id is required");
  if (!input.successor_id) errors.push("successor_id is required");
  if (input.predecessor_id === input.successor_id) errors.push("predecessor and successor must be different");
  if (!input.reason || input.reason.length < 5) errors.push("reason must be at least 5 characters");

  if (errors.length > 0) return { valid: false, errors, record: null };

  return {
    valid: true,
    errors: [],
    record: {
      predecessor_entry_id: input.predecessor_id,
      successor_entry_id: input.successor_id,
      reason: input.reason,
    },
  };
}
