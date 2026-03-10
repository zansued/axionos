/**
 * Runtime Feedback Explainer — Sprint 119
 * Human-readable explanations for runtime outcomes and lineage.
 */

export function explainOutcomeLineage(params: {
  event_type: string;
  severity: string;
  deploy_status?: string;
  stability_score?: number;
  incident_count?: number;
  rollback_count?: number;
}): Record<string, string> {
  const { event_type, severity, deploy_status, stability_score, incident_count, rollback_count } = params;

  return {
    event_summary: `Runtime event of type '${event_type}' with severity '${severity}'.`,
    deploy_context: deploy_status
      ? `Associated deployment status: ${deploy_status}.`
      : "No deployment directly linked.",
    stability: stability_score !== undefined
      ? `Current stability score: ${stability_score}/100.`
      : "Stability not yet computed.",
    incidents: `${incident_count || 0} incident(s) recorded.`,
    rollbacks: `${rollback_count || 0} rollback(s) recorded.`,
    governance: "All runtime signals remain evidence inputs. No automatic architecture mutation.",
  };
}

export function explainRuntimeFeedbackMesh(): Record<string, string> {
  return {
    purpose: "The Runtime Feedback Mesh connects deployment outcomes to live runtime behavior.",
    scope: "Events, incidents, rollbacks, degraded windows, and delivery-to-runtime lineage.",
    principle: "Runtime behavior is first-class evidence for future system decisions.",
    safety: "No runtime signal may silently alter architecture. All signals are advisory evidence.",
    lineage: "Every runtime event can be traced back to its originating deployment, validation, or repair.",
  };
}
