/**
 * Architecture Pilot Activation Controller — Sprint 41
 *
 * Validates eligibility, activates pilot under approved window,
 * supports pause and manual stop.
 */

export interface ActivationWindowConfig {
  start_at?: string;
  end_at?: string;
  max_duration_hours?: number;
}

export interface PilotActivationRequest {
  pilot_id: string;
  pilot_status: string;
  pilot_mode: string;
  activation_window: ActivationWindowConfig | null;
  guardrail_result: { allowed: boolean; violations: Array<{ rule: string }> };
}

export interface PilotActivationResult {
  can_activate: boolean;
  reason: string;
  activation_lineage: Record<string, unknown>;
}

export function evaluateActivation(req: PilotActivationRequest): PilotActivationResult {
  if (req.pilot_status !== "approved") {
    return {
      can_activate: false,
      reason: `Pilot must be in 'approved' status, currently: ${req.pilot_status}`,
      activation_lineage: {},
    };
  }

  if (!req.guardrail_result.allowed) {
    return {
      can_activate: false,
      reason: `Guardrail violations: ${req.guardrail_result.violations.map((v) => v.rule).join(", ")}`,
      activation_lineage: {},
    };
  }

  if (req.activation_window) {
    const now = new Date();
    if (req.activation_window.start_at && now < new Date(req.activation_window.start_at)) {
      return {
        can_activate: false,
        reason: `Activation window not yet open (starts: ${req.activation_window.start_at})`,
        activation_lineage: {},
      };
    }
    if (req.activation_window.end_at && now > new Date(req.activation_window.end_at)) {
      return {
        can_activate: false,
        reason: `Activation window expired (ended: ${req.activation_window.end_at})`,
        activation_lineage: {},
      };
    }
  }

  return {
    can_activate: true,
    reason: "All activation prerequisites met",
    activation_lineage: {
      activated_at: new Date().toISOString(),
      pilot_mode: req.pilot_mode,
      window: req.activation_window,
    },
  };
}

export function canPause(status: string): boolean {
  return status === "active";
}

export function canStop(status: string): boolean {
  return status === "active" || status === "paused";
}
