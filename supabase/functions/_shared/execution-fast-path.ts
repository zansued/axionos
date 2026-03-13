/**
 * OX-5: Selective Execution Fast-Path
 * 
 * Determines whether a file/task qualifies for the consolidated 2-call
 * worker path vs the standard 3-call path.
 * 
 * Evidence basis:
 * - OX-2: Efficiency layer was parasitic in execution (9-39s overhead) → already disabled
 * - OX-3: 2-call prototype merges Architect+Developer, keeps Integration Agent
 * - OX-4: Decision gate approved selective rollout with eligibility gating
 * 
 * Policy: Simple files use the fast 2-call path. Complex/high-risk files
 * stay on the safer 3-call path where the separate architect pass adds value.
 */

export interface FastPathEligibility {
  eligible: boolean;
  reason: string;
  /** Risk classification driving the decision */
  riskTier: "low" | "medium" | "high";
  /** Factors that contributed to the decision */
  factors: string[];
}

/** File types that benefit most from a separate architecture pass */
const HIGH_RISK_FILE_TYPES = new Set([
  "schema",
  "migration",
  "edge_function",
  "auth_config",
  "supabase_client",
]);

/** Extensions where architectural specification adds clear value */
const COMPLEX_EXTENSIONS = new Set([
  "sql",
]);

/** Files matching these patterns get the full 3-call treatment */
const COMPLEX_PATH_PATTERNS = [
  /supabase\/functions\/[^/]+\/index\.ts$/,   // Edge functions
  /supabase\/migrations\//,                    // Migrations
  /src\/integrations\//,                       // Integration layer
];

/** Maximum context size (chars) where the 2-call path handles well */
const MAX_CONTEXT_FOR_FAST_PATH = 12_000;

/**
 * Evaluate whether a file qualifies for the 2-call fast path.
 * 
 * Eligibility criteria:
 * - NOT a high-risk file type (schema, migration, edge function, auth)
 * - NOT matching complex path patterns
 * - Context size within manageable bounds
 * - NOT explicitly forced to standard path
 * 
 * Override: `useConsolidatedWorker` in payload takes precedence if set explicitly.
 */
export function evaluateFastPathEligibility(params: {
  filePath: string;
  fileType: string | null;
  contextLength: number;
  waveNum: number;
  /** If explicitly set by caller, overrides auto-detection */
  explicitOverride?: boolean;
}): FastPathEligibility {
  const factors: string[] = [];

  // Explicit override takes precedence
  if (params.explicitOverride === true) {
    return { eligible: true, reason: "explicit_override", riskTier: "low", factors: ["forced_by_caller"] };
  }
  if (params.explicitOverride === false) {
    return { eligible: false, reason: "explicit_override_off", riskTier: "high", factors: ["forced_standard_by_caller"] };
  }

  // High-risk file types → 3-call path
  if (params.fileType && HIGH_RISK_FILE_TYPES.has(params.fileType)) {
    return {
      eligible: false,
      reason: "high_risk_file_type",
      riskTier: "high",
      factors: [`file_type=${params.fileType} requires architectural specification`],
    };
  }

  // Complex path patterns → 3-call path
  for (const pattern of COMPLEX_PATH_PATTERNS) {
    if (pattern.test(params.filePath)) {
      return {
        eligible: false,
        reason: "complex_path_pattern",
        riskTier: "high",
        factors: [`path matches ${pattern.source}`],
      };
    }
  }

  // Complex extensions → 3-call path
  const ext = params.filePath.split(".").pop() || "";
  if (COMPLEX_EXTENSIONS.has(ext)) {
    return {
      eligible: false,
      reason: "complex_extension",
      riskTier: "medium",
      factors: [`extension .${ext} benefits from separate architect pass`],
    };
  }

  // Large context → 3-call path (architect pass helps organize)
  if (params.contextLength > MAX_CONTEXT_FOR_FAST_PATH) {
    factors.push(`context_length=${params.contextLength} exceeds threshold ${MAX_CONTEXT_FOR_FAST_PATH}`);
    return {
      eligible: false,
      reason: "large_context",
      riskTier: "medium",
      factors,
    };
  }

  // Wave 1 files are foundational — use 3-call for safety
  if (params.waveNum <= 1) {
    return {
      eligible: false,
      reason: "foundational_wave",
      riskTier: "medium",
      factors: ["wave 1 files are foundational, use full pipeline"],
    };
  }

  // All checks passed → eligible for fast path
  factors.push("standard_frontend_or_component_file");
  factors.push(`wave=${params.waveNum}`);
  factors.push(`context_length=${params.contextLength}`);

  return {
    eligible: true,
    reason: "eligible",
    riskTier: "low",
    factors,
  };
}
