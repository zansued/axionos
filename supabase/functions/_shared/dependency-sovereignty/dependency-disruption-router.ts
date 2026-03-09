/**
 * Dependency Disruption Router
 * Connects disruption events to dependent assets and continuity effects.
 */
export interface DisruptionEvent {
  id: string;
  dependency_id: string;
  disruption_type: string;
  severity: string;
  continuity_effect: string;
}

export interface DisruptionImpact {
  event: DisruptionEvent;
  affectedAssetCount: number;
  criticalAssetsAffected: number;
  continuityRisk: string;
}

export function assessDisruptionImpact(
  event: DisruptionEvent,
  relianceLinks: { dependency_id: string; reliance_type: string }[]
): DisruptionImpact {
  const affected = relianceLinks.filter(l => l.dependency_id === event.dependency_id);
  const critical = affected.filter(l => l.reliance_type === "critical");
  const continuityRisk = critical.length > 0 ? "high" : affected.length > 3 ? "medium" : "low";
  return { event, affectedAssetCount: affected.length, criticalAssetsAffected: critical.length, continuityRisk };
}
