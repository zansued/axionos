// Repair Routing Contract — AxionOS Sprint 9
// Captures how the system decided which repair strategy to apply.

export type DecisionSource =
  | "static_map"
  | "pattern_library"
  | "strategy_effectiveness"
  | "fallback";

export interface StrategyRanking {
  strategy_id: string;
  score: number;
  success_rate: number;
  recency_factor: number;
  stage_match: number;
  source: DecisionSource;
}

export interface RepairRouting {
  routing_id: string;
  initiative_id: string;
  error_category: string;
  error_signature: string;
  pipeline_stage: string;
  selected_strategy: string;
  strategy_rankings: StrategyRanking[];
  confidence_score: number;
  decision_source: DecisionSource;
  created_at: string;
}

const DECISION_SOURCES: DecisionSource[] = [
  "static_map", "pattern_library", "strategy_effectiveness", "fallback",
];

export function validateRepairRouting(
  data: unknown,
): { success: true; data: RepairRouting } | { success: false; error: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Repair routing must be an object" };
  }
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.routing_id || typeof d.routing_id !== "string") errors.push("routing_id required");
  if (!d.error_category || typeof d.error_category !== "string") errors.push("error_category required");
  if (!d.selected_strategy || typeof d.selected_strategy !== "string") errors.push("selected_strategy required");
  if (!DECISION_SOURCES.includes(d.decision_source as DecisionSource)) {
    errors.push(`decision_source must be one of: ${DECISION_SOURCES.join(", ")}`);
  }

  if (errors.length > 0) return { success: false, error: errors.join("; ") };
  return { success: true, data: d as unknown as RepairRouting };
}
