/**
 * Boundary Explainer — Sprint 101
 * Generates human-readable explanations for transfer decisions.
 */

import { TransferGuardResult } from "./federated-transfer-guard.ts";
import { ResolvedPolicy } from "./boundary-policy-resolver.ts";
import { SignalClassification } from "./signal-shareability-classifier.ts";

export interface BoundaryExplanation {
  headline: string;
  boundary_description: string;
  policy_applied: string;
  signal_classification: string;
  decision_rationale: string;
  transformation_note: string | null;
  governance_posture: string;
}

export function explainTransferDecision(
  resolved: ResolvedPolicy,
  classification: SignalClassification,
  guard: TransferGuardResult
): BoundaryExplanation {
  const b = resolved.boundary;

  const headline =
    guard.decision === "allowed"
      ? `Transfer ALLOWED: "${classification.signal_type}" from ${b.source_scope} → ${b.target_scope}`
      : guard.decision === "denied"
      ? `Transfer DENIED: "${classification.signal_type}" blocked at boundary "${b.boundary_code}"`
      : guard.decision === "transformed"
      ? `Transfer TRANSFORMED: "${classification.signal_type}" modified (${guard.transformation_type}) before crossing`
      : `Transfer ESCALATED: "${classification.signal_type}" requires human review`;

  return {
    headline,
    boundary_description: `Boundary "${b.boundary_code}" (${b.boundary_type}) governs transfers from "${b.source_scope}" to "${b.target_scope}".`,
    policy_applied: resolved.policy
      ? `Policy for signal type "${resolved.policy.signal_type}": mode=${resolved.policy.transfer_mode}, sensitivity=${resolved.policy.sensitivity_level}.`
      : `No explicit policy found. Default behavior for ${b.boundary_type} boundary applied.`,
    signal_classification: `Signal "${classification.signal_type}" classified as ${classification.shareability} (sensitivity: ${classification.sensitivity}). ${classification.reason}`,
    decision_rationale: guard.reason,
    transformation_note: guard.transformation_type
      ? `Payload was transformed via ${guard.transformation_type} before crossing the boundary.`
      : null,
    governance_posture: guard.requires_review
      ? "Human review required before this transfer can proceed."
      : guard.decision === "denied"
      ? "Transfer blocked — no further action needed."
      : "Transfer processed within governed boundaries.",
  };
}
