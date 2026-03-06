// Initiative Simulation Report Schema — the decision layer between idea intake and pipeline execution.
// Validates the structured output from the simulation engine.

export interface InitiativeSimulation {
  initiative_id: string;
  technical_feasibility: FeasibilityLevel;
  market_clarity: FeasibilityLevel;
  execution_complexity: ComplexityLevel;
  estimated_token_range: { min: number; max: number };
  estimated_cost_range: { min_usd: number; max_usd: number };
  estimated_time_minutes: { min: number; max: number };
  recommended_generation_depth: GenerationDepthLevel;
  recommended_stack?: {
    frontend?: string;
    backend?: string;
    database?: string;
    deployment?: string;
  };
  risk_flags: RiskFlag[];
  pipeline_recommendation: PipelineRecommendation;
  recommendation_reason: string;
  suggested_refinements?: string[];
}

export type FeasibilityLevel = "high" | "medium" | "low";
export type ComplexityLevel = "simple" | "moderate" | "complex";
export type GenerationDepthLevel = "mvp" | "production" | "enterprise";
export type PipelineRecommendation = "go" | "refine" | "block";

export type RiskType =
  | "product_scope_risk"
  | "architecture_risk"
  | "integration_risk"
  | "cost_risk"
  | "market_risk"
  | "dependency_risk";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export interface RiskFlag {
  type: RiskType;
  severity: RiskSeverity;
  message: string;
}

const FEASIBILITY_LEVELS: FeasibilityLevel[] = ["high", "medium", "low"];
const COMPLEXITY_LEVELS: ComplexityLevel[] = ["simple", "moderate", "complex"];
const DEPTH_LEVELS: GenerationDepthLevel[] = ["mvp", "production", "enterprise"];
const RECOMMENDATIONS: PipelineRecommendation[] = ["go", "refine", "block"];
const RISK_TYPES: RiskType[] = [
  "product_scope_risk", "architecture_risk", "integration_risk",
  "cost_risk", "market_risk", "dependency_risk",
];
const RISK_SEVERITIES: RiskSeverity[] = ["low", "medium", "high", "critical"];

export function validateSimulationReport(
  data: unknown,
): { success: true; data: InitiativeSimulation } | { success: false; error: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Simulation report must be an object" };
  }

  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof d.initiative_id !== "string" || !d.initiative_id) {
    errors.push("initiative_id is required");
  }

  if (!FEASIBILITY_LEVELS.includes(d.technical_feasibility as FeasibilityLevel)) {
    errors.push(`technical_feasibility must be one of: ${FEASIBILITY_LEVELS.join(", ")}`);
  }
  if (!FEASIBILITY_LEVELS.includes(d.market_clarity as FeasibilityLevel)) {
    errors.push(`market_clarity must be one of: ${FEASIBILITY_LEVELS.join(", ")}`);
  }
  if (!COMPLEXITY_LEVELS.includes(d.execution_complexity as ComplexityLevel)) {
    errors.push(`execution_complexity must be one of: ${COMPLEXITY_LEVELS.join(", ")}`);
  }
  if (!DEPTH_LEVELS.includes(d.recommended_generation_depth as GenerationDepthLevel)) {
    errors.push(`recommended_generation_depth must be one of: ${DEPTH_LEVELS.join(", ")}`);
  }
  if (!RECOMMENDATIONS.includes(d.pipeline_recommendation as PipelineRecommendation)) {
    errors.push(`pipeline_recommendation must be one of: ${RECOMMENDATIONS.join(", ")}`);
  }

  // Validate range objects
  for (const [field, keys] of [
    ["estimated_token_range", ["min", "max"]],
    ["estimated_cost_range", ["min_usd", "max_usd"]],
    ["estimated_time_minutes", ["min", "max"]],
  ] as const) {
    const obj = d[field];
    if (!obj || typeof obj !== "object") {
      errors.push(`${field} must be an object with ${keys.join(", ")}`);
    } else {
      for (const k of keys) {
        if (typeof (obj as Record<string, unknown>)[k] !== "number") {
          errors.push(`${field}.${k} must be a number`);
        }
      }
    }
  }

  // Validate risk_flags
  if (!Array.isArray(d.risk_flags)) {
    errors.push("risk_flags must be an array");
  } else {
    for (let i = 0; i < d.risk_flags.length; i++) {
      const flag = d.risk_flags[i] as Record<string, unknown>;
      if (!RISK_TYPES.includes(flag?.type as RiskType)) {
        errors.push(`risk_flags[${i}].type is invalid`);
      }
      if (!RISK_SEVERITIES.includes(flag?.severity as RiskSeverity)) {
        errors.push(`risk_flags[${i}].severity is invalid`);
      }
      if (typeof flag?.message !== "string") {
        errors.push(`risk_flags[${i}].message must be a string`);
      }
    }
  }

  if (typeof d.recommendation_reason !== "string" || !d.recommendation_reason) {
    errors.push("recommendation_reason is required");
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  return {
    success: true,
    data: {
      initiative_id: d.initiative_id as string,
      technical_feasibility: d.technical_feasibility as FeasibilityLevel,
      market_clarity: d.market_clarity as FeasibilityLevel,
      execution_complexity: d.execution_complexity as ComplexityLevel,
      estimated_token_range: d.estimated_token_range as { min: number; max: number },
      estimated_cost_range: d.estimated_cost_range as { min_usd: number; max_usd: number },
      estimated_time_minutes: d.estimated_time_minutes as { min: number; max: number },
      recommended_generation_depth: d.recommended_generation_depth as GenerationDepthLevel,
      recommended_stack: d.recommended_stack as InitiativeSimulation["recommended_stack"],
      risk_flags: d.risk_flags as RiskFlag[],
      pipeline_recommendation: d.pipeline_recommendation as PipelineRecommendation,
      recommendation_reason: d.recommendation_reason as string,
      suggested_refinements: Array.isArray(d.suggested_refinements) ? d.suggested_refinements as string[] : undefined,
    },
  };
}
