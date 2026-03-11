/**
 * containment-controller.ts
 * Manages containment actions — advisory only, no real mutation.
 */

export interface ContainmentRequest {
  incident_type: string;
  severity: string;
  target_surface: string;
}

export interface ContainmentPlan {
  containment_type: string;
  scope: string;
  description: string;
  rollback_available: boolean;
  advisory_only: boolean;
}

export function planContainment(req: ContainmentRequest): ContainmentPlan {
  if (req.severity === "critical" || req.severity === "high") {
    return {
      containment_type: "isolate_execution",
      scope: req.target_surface,
      description: `Recommend isolating execution on surface "${req.target_surface}" due to ${req.incident_type} (${req.severity}).`,
      rollback_available: true,
      advisory_only: true,
    };
  }
  return {
    containment_type: "increase_monitoring",
    scope: req.target_surface,
    description: `Recommend increased monitoring on surface "${req.target_surface}" for ${req.incident_type}.`,
    rollback_available: true,
    advisory_only: true,
  };
}
