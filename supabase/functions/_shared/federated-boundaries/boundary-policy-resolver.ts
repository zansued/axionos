/**
 * Boundary Policy Resolver — Sprint 101
 * Resolves the applicable boundary and transfer policy for a given signal crossing.
 */

export interface BoundaryRecord {
  id: string;
  boundary_code: string;
  source_scope: string;
  target_scope: string;
  boundary_type: "hard" | "controlled" | "advisory" | "aggregate_only";
  boundary_status: string;
}

export interface TransferPolicy {
  id: string;
  boundary_id: string;
  signal_type: string;
  transfer_mode: "deny" | "allow" | "allow_aggregated" | "allow_anonymized" | "allow_with_review";
  sensitivity_level: string;
  justification_requirements: string;
  review_policy: string;
  active: boolean;
}

export interface ResolvedPolicy {
  boundary: BoundaryRecord;
  policy: TransferPolicy | null;
  effective_mode: TransferPolicy["transfer_mode"];
  reason: string;
}

/**
 * Resolve the effective transfer policy for a signal crossing a boundary.
 * Default-deny: if no policy exists, deny.
 */
export function resolvePolicy(
  boundary: BoundaryRecord,
  policies: TransferPolicy[],
  signalType: string
): ResolvedPolicy {
  // Hard boundaries always deny
  if (boundary.boundary_type === "hard") {
    return {
      boundary,
      policy: null,
      effective_mode: "deny",
      reason: `Hard boundary "${boundary.boundary_code}" blocks all transfers.`,
    };
  }

  // Find matching active policy
  const match = policies.find(
    (p) => p.boundary_id === boundary.id && p.signal_type === signalType && p.active
  );

  if (!match) {
    // Default deny for controlled; advisory returns allow_with_review
    if (boundary.boundary_type === "advisory") {
      return {
        boundary,
        policy: null,
        effective_mode: "allow_with_review",
        reason: `Advisory boundary "${boundary.boundary_code}" — no explicit policy for "${signalType}". Defaulting to allow_with_review.`,
      };
    }
    if (boundary.boundary_type === "aggregate_only") {
      return {
        boundary,
        policy: null,
        effective_mode: "allow_aggregated",
        reason: `Aggregate-only boundary "${boundary.boundary_code}" — no explicit policy for "${signalType}". Defaulting to allow_aggregated.`,
      };
    }
    return {
      boundary,
      policy: null,
      effective_mode: "deny",
      reason: `Controlled boundary "${boundary.boundary_code}" — no policy for "${signalType}". Defaulting to deny.`,
    };
  }

  return {
    boundary,
    policy: match,
    effective_mode: match.transfer_mode,
    reason: `Policy found for signal "${signalType}" on boundary "${boundary.boundary_code}": ${match.transfer_mode}.`,
  };
}
