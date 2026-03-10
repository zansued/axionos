/**
 * Runtime Outcome Lineage Builder — Sprint 119
 * Builds lineage links between runtime events and their sources.
 */

export interface LineageLink {
  event_id: string;
  lineage_type: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  correlation_score: number;
  notes: string;
}

export function buildLineageLink(params: {
  event_id: string;
  source_type: string;
  source_id: string;
  target_type?: string;
  target_id?: string;
  correlation_score?: number;
}): LineageLink {
  const lineageType = inferLineageType(params.source_type);
  return {
    event_id: params.event_id,
    lineage_type: lineageType,
    source_type: params.source_type,
    source_id: params.source_id,
    target_type: params.target_type || "runtime_event",
    target_id: params.target_id || params.event_id,
    correlation_score: Math.max(0, Math.min(100, params.correlation_score || 50)),
    notes: "",
  };
}

function inferLineageType(sourceType: string): string {
  switch (sourceType) {
    case "deploy": return "deploy_to_runtime";
    case "validation": return "validation_to_runtime";
    case "repair": return "repair_to_runtime";
    case "canon_entry": return "canon_to_runtime";
    case "initiative": return "initiative_to_runtime";
    default: return "generic";
  }
}
