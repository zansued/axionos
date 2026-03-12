// Initiative Brief Schema — the official contract between user intent and pipeline execution.
// This schema defines the structured input that enters Stage 01 of the pipeline.

// NOTE: Using manual validation instead of Zod since Deno edge functions
// don't have zod available without import maps. This provides equivalent validation.

export interface InitiativeBrief {
  name: string;
  description: string;
  problem: string;
  target_users: string[];
  product_type: ProductType;
  core_features: string[];
  integrations?: string[];
  tech_preferences?: TechPreferences;
  deployment_target: DeploymentTarget;
  complexity_estimate: ComplexityEstimate;
  generation_depth: GenerationDepth;
  expected_outputs: ExpectedOutput[];
}

export type ProductType =
  | "saas"
  | "marketplace"
  | "mobile_app"
  | "internal_tool"
  | "ai_product"
  | "api_product"
  | "backend_api";

export type DeploymentTarget =
  | "vercel"
  | "netlify"
  | "aws"
  | "cloudflare"
  | "docker"
  | "unknown";

export type ComplexityEstimate = "simple" | "moderate" | "complex";

export type GenerationDepth = "mvp" | "production" | "enterprise";

export type ExpectedOutput =
  | "repository"
  | "deployment"
  | "architecture_docs"
  | "prd"
  | "api_spec";

export interface TechPreferences {
  frontend?: string;
  backend?: string;
  database?: string;
  deployment?: string;
}

const PRODUCT_TYPES: ProductType[] = ["saas", "marketplace", "mobile_app", "internal_tool", "ai_product", "api_product"];
const DEPLOYMENT_TARGETS: DeploymentTarget[] = ["vercel", "netlify", "aws", "cloudflare", "docker", "unknown"];
const COMPLEXITY_ESTIMATES: ComplexityEstimate[] = ["simple", "moderate", "complex"];
const GENERATION_DEPTHS: GenerationDepth[] = ["mvp", "production", "enterprise"];
const EXPECTED_OUTPUTS: ExpectedOutput[] = ["repository", "deployment", "architecture_docs", "prd", "api_spec"];

export function validateInitiativeBrief(data: unknown): { success: true; data: InitiativeBrief } | { success: false; error: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Initiative brief must be an object" };
  }

  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  // Required strings
  for (const field of ["name", "description", "problem"] as const) {
    if (typeof d[field] !== "string" || !(d[field] as string).trim()) {
      errors.push(`${field} is required and must be a non-empty string`);
    }
  }

  // target_users: array of strings
  if (!Array.isArray(d.target_users) || d.target_users.length === 0) {
    errors.push("target_users must be a non-empty array of strings");
  } else if (d.target_users.some((u: unknown) => typeof u !== "string")) {
    errors.push("target_users must contain only strings");
  }

  // Enums
  if (!PRODUCT_TYPES.includes(d.product_type as ProductType)) {
    errors.push(`product_type must be one of: ${PRODUCT_TYPES.join(", ")}`);
  }
  if (!DEPLOYMENT_TARGETS.includes(d.deployment_target as DeploymentTarget)) {
    errors.push(`deployment_target must be one of: ${DEPLOYMENT_TARGETS.join(", ")}`);
  }
  if (!COMPLEXITY_ESTIMATES.includes(d.complexity_estimate as ComplexityEstimate)) {
    errors.push(`complexity_estimate must be one of: ${COMPLEXITY_ESTIMATES.join(", ")}`);
  }
  if (!GENERATION_DEPTHS.includes(d.generation_depth as GenerationDepth)) {
    errors.push(`generation_depth must be one of: ${GENERATION_DEPTHS.join(", ")}`);
  }

  // core_features: array of strings
  if (!Array.isArray(d.core_features) || d.core_features.length === 0) {
    errors.push("core_features must be a non-empty array of strings");
  }

  // expected_outputs: array of valid enums
  if (!Array.isArray(d.expected_outputs) || d.expected_outputs.length === 0) {
    errors.push("expected_outputs must be a non-empty array");
  } else {
    const invalid = (d.expected_outputs as string[]).filter((o) => !EXPECTED_OUTPUTS.includes(o as ExpectedOutput));
    if (invalid.length > 0) {
      errors.push(`expected_outputs contains invalid values: ${invalid.join(", ")}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  return {
    success: true,
    data: {
      name: (d.name as string).trim(),
      description: (d.description as string).trim(),
      problem: (d.problem as string).trim(),
      target_users: d.target_users as string[],
      product_type: d.product_type as ProductType,
      core_features: d.core_features as string[],
      integrations: Array.isArray(d.integrations) ? d.integrations as string[] : undefined,
      tech_preferences: d.tech_preferences as TechPreferences | undefined,
      deployment_target: d.deployment_target as DeploymentTarget,
      complexity_estimate: d.complexity_estimate as ComplexityEstimate,
      generation_depth: d.generation_depth as GenerationDepth,
      expected_outputs: d.expected_outputs as ExpectedOutput[],
    },
  };
}
