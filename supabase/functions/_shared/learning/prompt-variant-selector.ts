/**
 * Prompt Variant Selector — Sprint 21
 *
 * Selects control vs experiment variant for a given stage execution.
 * Selection is deterministic, auditable, and bounded.
 */

export interface VariantSelectionInput {
  stageKey: string;
  organizationId: string;
  agentType?: string;
  modelProvider?: string;
  modelName?: string;
  /** Seed for deterministic routing (e.g. initiative_id hash) */
  routingSeed: number;
}

export interface PromptVariant {
  id: string;
  stage_key: string;
  variant_name: string;
  variant_version: number;
  prompt_template: string;
  variables_schema: Record<string, unknown> | null;
  status: string;
  is_enabled: boolean;
  base_prompt_signature: string;
}

export interface VariantSelectionResult {
  selectedVariant: PromptVariant;
  isExperiment: boolean;
  selectionReason: string;
  exposureStrategy: string;
}

export type ExposureStrategy = "90_10" | "80_20" | "70_30" | "50_50";

/** Stages that are never eligible for experiments */
const CRITICAL_STAGES = new Set([
  "pipeline-publish",
  "pipeline-deploy",
  "pipeline-ci-webhook",
  "github-ci-webhook",
]);

export function isStageCritical(stageKey: string): boolean {
  return CRITICAL_STAGES.has(stageKey);
}

/**
 * Select a prompt variant given the available variants for a stage.
 *
 * Rules:
 * - Always defaults to control if no experiment variants exist
 * - Critical stages never route to experiments
 * - Uses deterministic routing based on seed
 * - Supports configurable exposure ratios
 */
export function selectVariant(
  variants: PromptVariant[],
  input: VariantSelectionInput,
  exposureStrategy: ExposureStrategy = "90_10",
): VariantSelectionResult {
  const enabledVariants = variants.filter((v) => v.is_enabled);

  const control = enabledVariants.find((v) => v.status === "active_control");
  const experiments = enabledVariants.filter((v) => v.status === "active_experiment");

  // Fallback: no control → use first enabled variant or first variant
  const fallback = enabledVariants[0] || variants[0];

  if (!control) {
    return {
      selectedVariant: fallback,
      isExperiment: false,
      selectionReason: "no_control_variant_found",
      exposureStrategy: "none",
    };
  }

  // Critical stages: always control
  if (isStageCritical(input.stageKey)) {
    return {
      selectedVariant: control,
      isExperiment: false,
      selectionReason: "critical_stage_locked_to_control",
      exposureStrategy: "none",
    };
  }

  // No experiments: always control
  if (experiments.length === 0) {
    return {
      selectedVariant: control,
      isExperiment: false,
      selectionReason: "no_experiment_variants",
      exposureStrategy: "none",
    };
  }

  // Determine experiment exposure threshold
  const experimentThreshold = getExperimentThreshold(exposureStrategy);

  // Deterministic routing: use seed modulo 100
  const bucket = Math.abs(input.routingSeed) % 100;

  if (bucket < experimentThreshold) {
    // Route to experiment — pick one deterministically
    const expIndex = Math.abs(input.routingSeed) % experiments.length;
    return {
      selectedVariant: experiments[expIndex],
      isExperiment: true,
      selectionReason: `routed_to_experiment_bucket_${bucket}_threshold_${experimentThreshold}`,
      exposureStrategy,
    };
  }

  return {
    selectedVariant: control,
    isExperiment: false,
    selectionReason: `routed_to_control_bucket_${bucket}_threshold_${experimentThreshold}`,
    exposureStrategy,
  };
}

function getExperimentThreshold(strategy: ExposureStrategy): number {
  switch (strategy) {
    case "90_10": return 10;
    case "80_20": return 20;
    case "70_30": return 30;
    case "50_50": return 50;
    default: return 10;
  }
}

/**
 * Compute a deterministic routing seed from a string (e.g. initiative_id).
 */
export function computeRoutingSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
