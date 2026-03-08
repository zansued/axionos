// Delivery Orchestration Model Manager
// Manages one-click delivery models and release path definitions.

export interface DeliveryModel {
  delivery_model_name: string;
  release_path: string[];
  gate_requirements: string[];
  rollback_policy: { auto_rollback: boolean; rollback_window_minutes: number };
  assurance_thresholds: { min_confidence: number; min_validation_gate: number; min_readiness: number };
  description: string;
}

export const DEFAULT_DELIVERY_MODEL: DeliveryModel = {
  delivery_model_name: "one_click_default",
  release_path: ["validate", "assess_readiness", "prepare_deploy", "deploy", "verify_output", "handoff"],
  gate_requirements: ["validation_passed", "no_critical_blockers", "approval_gates_cleared"],
  rollback_policy: { auto_rollback: false, rollback_window_minutes: 60 },
  assurance_thresholds: { min_confidence: 0.7, min_validation_gate: 0.8, min_readiness: 0.6 },
  description: "Default governed one-click delivery model with validation gates, deploy assurance, and rollback awareness.",
};

export type DeliveryState =
  | "not_started"
  | "assessing"
  | "ready"
  | "blocked"
  | "deploying"
  | "deployed"
  | "partial"
  | "failed"
  | "rolled_back"
  | "recovered";

export function getDeliveryStateLabel(state: DeliveryState): string {
  const labels: Record<DeliveryState, string> = {
    not_started: "Not Started",
    assessing: "Assessing Readiness...",
    ready: "Ready to Deploy",
    blocked: "Blocked — Action Required",
    deploying: "Deploying...",
    deployed: "Successfully Deployed",
    partial: "Partially Deployed",
    failed: "Deploy Failed",
    rolled_back: "Rolled Back",
    recovered: "Recovered",
  };
  return labels[state] ?? state;
}

export function getDeliveryStateColor(state: DeliveryState): string {
  const colors: Record<DeliveryState, string> = {
    not_started: "muted",
    assessing: "accent",
    ready: "primary",
    blocked: "destructive",
    deploying: "accent",
    deployed: "primary",
    partial: "accent",
    failed: "destructive",
    rolled_back: "destructive",
    recovered: "primary",
  };
  return colors[state] ?? "muted";
}
