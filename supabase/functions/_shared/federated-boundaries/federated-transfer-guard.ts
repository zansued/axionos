/**
 * Federated Transfer Guard — Sprint 101
 * Applies guardrails to signal transfers across boundaries.
 */

import { ResolvedPolicy } from "./boundary-policy-resolver.ts";
import { SignalClassification } from "./signal-shareability-classifier.ts";

export interface TransferGuardResult {
  decision: "allowed" | "denied" | "transformed" | "escalated";
  transformation_type: string | null;
  reason: string;
  requires_review: boolean;
}

export function evaluateTransfer(
  resolved: ResolvedPolicy,
  classification: SignalClassification
): TransferGuardResult {
  // Prohibited signals are always denied
  if (classification.shareability === "prohibited") {
    return {
      decision: "denied",
      transformation_type: null,
      reason: `Signal "${classification.signal_type}" is prohibited from crossing any boundary.`,
      requires_review: false,
    };
  }

  const mode = resolved.effective_mode;

  if (mode === "deny") {
    return {
      decision: "denied",
      transformation_type: null,
      reason: resolved.reason,
      requires_review: false,
    };
  }

  if (mode === "allow") {
    if (classification.sensitivity === "high" || classification.sensitivity === "critical") {
      return {
        decision: "escalated",
        transformation_type: null,
        reason: `Policy allows transfer but signal sensitivity is ${classification.sensitivity} — escalating for review.`,
        requires_review: true,
      };
    }
    return {
      decision: "allowed",
      transformation_type: null,
      reason: `Transfer allowed by policy on boundary "${resolved.boundary.boundary_code}".`,
      requires_review: false,
    };
  }

  if (mode === "allow_aggregated") {
    return {
      decision: "transformed",
      transformation_type: "aggregation",
      reason: `Signal will be aggregated before crossing boundary "${resolved.boundary.boundary_code}".`,
      requires_review: false,
    };
  }

  if (mode === "allow_anonymized") {
    return {
      decision: "transformed",
      transformation_type: "anonymization",
      reason: `Signal will be anonymized before crossing boundary "${resolved.boundary.boundary_code}".`,
      requires_review: false,
    };
  }

  if (mode === "allow_with_review") {
    return {
      decision: "escalated",
      transformation_type: null,
      reason: `Transfer requires human review before crossing boundary "${resolved.boundary.boundary_code}".`,
      requires_review: true,
    };
  }

  return {
    decision: "denied",
    transformation_type: null,
    reason: "Unknown transfer mode — defaulting to deny.",
    requires_review: false,
  };
}
