/**
 * DX-2: Execution Risk Signals
 *
 * Provides richer, explainable risk signals beyond the basic heuristics
 * (file type, wave, context length) used by OX-5 fast-path eligibility.
 *
 * Each signal is:
 *   - precisely defined
 *   - cheap to compute (static analysis or metadata lookup)
 *   - explainable to an engineer or operator
 *   - stored alongside execution metrics for future classifier input
 *
 * These signals DO NOT change routing decisions yet (that's a future sprint).
 * They are computed, logged, and made available for inspection.
 */

// ─── Signal Definitions ──────────────────────────────────────────

export interface ExecutionRiskSignals {
  /**
   * Import Density
   * What: Number of import statements in the generated code.
   * Source: Static analysis of code output.
   * Type: Derived (post-generation).
   * Rationale: High import density correlates with integration failures
   *   because more external dependencies = more chances for broken paths.
   * Confidence: High — directly measurable, strong DX-1 signal.
   */
  import_density: number;

  /**
   * Dependency Fan-Out
   * What: Number of unique modules/paths imported.
   * Source: Static analysis of import statements.
   * Type: Derived (post-generation).
   * Rationale: Distinct from import_density — a file may import 10 things
   *   from 2 modules (low fan-out) vs 10 things from 10 modules (high fan-out).
   *   High fan-out = higher integration surface area.
   * Confidence: High — directly measurable.
   */
  dependency_fan_out: number;

  /**
   * Auth/Schema Sensitivity
   * What: Whether the file path or content touches authentication,
   *   authorization, schema definitions, or security-critical contracts.
   * Source: Static analysis of file path + code content patterns.
   * Type: Static (deterministic from inputs).
   * Rationale: Auth/schema files have outsized blast radius on failure.
   *   DX-1 identified these as under-detected by current file_type checks.
   * Confidence: Medium — pattern-based, may have false positives on
   *   files that merely reference auth without being auth-critical.
   */
  auth_schema_sensitivity: boolean;

  /**
   * Operational Sensitivity Score
   * What: 0–1 score indicating how operationally critical the file appears,
   *   based on naming patterns, path location, and content markers.
   * Source: Static analysis of path + content.
   * Type: Static/derived.
   * Rationale: Files named "provider", "config", "client", "middleware"
   *   tend to be infrastructure-critical even if their file_type is generic.
   * Confidence: Medium — heuristic, but aligns well with DX-1 findings.
   */
  operational_sensitivity: number;

  /**
   * Has Re-export Pattern
   * What: Whether the file re-exports from other modules (barrel file pattern).
   * Source: Static analysis.
   * Type: Derived.
   * Rationale: Barrel/index files are dependency hubs. Errors in them
   *   cascade widely. Worth flagging as higher-risk.
   * Confidence: High — directly detectable.
   */
  has_reexport_pattern: boolean;

  /**
   * Retry Indicator
   * What: Whether this execution is a retry of a previously failed attempt.
   * Source: Payload metadata (retryCount).
   * Type: Static (from input).
   * Rationale: Retries indicate prior failure. A file that already failed
   *   once should be treated with more caution. DX-1 flagged this as
   *   completely ignored by current routing.
   * Confidence: High — binary, no ambiguity.
   */
  is_retry: boolean;

  /**
   * Content Complexity Estimate
   * What: Rough complexity proxy based on code characteristics:
   *   nested callbacks, conditional depth, async patterns.
   * Source: Static analysis of generated code.
   * Type: Derived (post-generation).
   * Rationale: Context length alone doesn't capture complexity.
   *   A 500-line file of simple JSX is less risky than a 200-line file
   *   with deeply nested async/conditional logic.
   * Confidence: Low-Medium — rough heuristic, not a real AST analysis.
   * Limitation: Computed post-generation, so can't guide pre-routing.
   *   Useful for auditing and future adaptive policy.
   */
  content_complexity_estimate: number;
}

/**
 * Composite risk score (0–1) summarizing all signals.
 * NOT used for routing yet — purely for observability and future classifier input.
 */
export interface RiskAssessment {
  signals: ExecutionRiskSignals;
  /** Weighted composite score, 0 = no risk, 1 = maximum risk */
  composite_score: number;
  /** Human-readable explanation of the top risk factors */
  top_factors: string[];
  /** Signals that were weak or inconclusive */
  weak_signals: string[];
}

// ─── Signal Extraction ───────────────────────────────────────────

/** Count import statements */
function extractImportDensity(code: string): number {
  const matches = code.match(/^import\s/gm);
  return matches ? matches.length : 0;
}

/** Count unique import source paths */
function extractDependencyFanOut(code: string): number {
  const importPaths = new Set<string>();
  const regex = /from\s+["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    importPaths.add(match[1]);
  }
  return importPaths.size;
}

/** Sensitive path and content patterns */
const AUTH_SCHEMA_PATH_PATTERNS = [
  /auth/i,
  /login/i,
  /signup|sign-up|register/i,
  /session/i,
  /permission/i,
  /role/i,
  /schema/i,
  /migration/i,
  /\.sql$/,
  /middleware/i,
  /guard/i,
  /protect/i,
];

const AUTH_SCHEMA_CONTENT_PATTERNS = [
  /supabase\.auth\./,
  /createClient/,
  /RLS|row.level.security/i,
  /CREATE\s+TABLE/i,
  /ALTER\s+TABLE/i,
  /CREATE\s+POLICY/i,
  /auth\.users/i,
  /signIn|signUp|signOut/,
  /useSession|useAuth/,
];

function detectAuthSchemaSensitivity(filePath: string, code: string): boolean {
  for (const pattern of AUTH_SCHEMA_PATH_PATTERNS) {
    if (pattern.test(filePath)) return true;
  }
  for (const pattern of AUTH_SCHEMA_CONTENT_PATTERNS) {
    if (pattern.test(code)) return true;
  }
  return false;
}

/** Operational sensitivity patterns with weights */
const OPERATIONAL_PATTERNS: { pattern: RegExp; weight: number; target: "path" | "content" | "both" }[] = [
  { pattern: /provider/i, weight: 0.3, target: "path" },
  { pattern: /config/i, weight: 0.2, target: "path" },
  { pattern: /client/i, weight: 0.25, target: "path" },
  { pattern: /middleware/i, weight: 0.3, target: "path" },
  { pattern: /context/i, weight: 0.2, target: "path" },
  { pattern: /store/i, weight: 0.15, target: "path" },
  { pattern: /index\.(ts|tsx|js|jsx)$/, weight: 0.1, target: "path" },
  { pattern: /createContext|useContext/i, weight: 0.2, target: "content" },
  { pattern: /addEventListener|removeEventListener/, weight: 0.15, target: "content" },
  { pattern: /process\.env|import\.meta\.env/, weight: 0.2, target: "content" },
  { pattern: /localStorage|sessionStorage/, weight: 0.15, target: "content" },
];

function computeOperationalSensitivity(filePath: string, code: string): number {
  let score = 0;
  for (const { pattern, weight, target } of OPERATIONAL_PATTERNS) {
    if (target === "path" || target === "both") {
      if (pattern.test(filePath)) score += weight;
    }
    if (target === "content" || target === "both") {
      if (pattern.test(code)) score += weight;
    }
  }
  return Math.min(1, score);
}

/** Detect barrel/re-export files */
function detectReexportPattern(code: string): boolean {
  const reexportRegex = /^export\s+(\{[^}]+\}|\*)\s+from\s+/gm;
  const matches = code.match(reexportRegex);
  if (!matches) return false;
  // A file is a barrel if >50% of its exports are re-exports
  const totalExports = (code.match(/^export\s/gm) || []).length;
  return totalExports > 0 && matches.length / totalExports > 0.5;
}

/** Rough complexity estimate based on nesting and async patterns */
function estimateContentComplexity(code: string): number {
  let score = 0;
  const lines = code.split("\n").length;

  // Normalize by file size (tiny files aren't complex)
  if (lines < 20) return 0;

  // Nesting depth proxy: count max consecutive indentation increases
  let maxIndent = 0;
  let currentIndent = 0;
  for (const line of code.split("\n")) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;
    if (indent > currentIndent) {
      maxIndent = Math.max(maxIndent, indent);
    }
    currentIndent = indent;
  }
  score += Math.min(0.3, (maxIndent / 20) * 0.3);

  // Async complexity
  const asyncCount = (code.match(/\basync\b/g) || []).length;
  const awaitCount = (code.match(/\bawait\b/g) || []).length;
  score += Math.min(0.2, (asyncCount + awaitCount) / 20 * 0.2);

  // Conditional complexity
  const conditionals = (code.match(/\b(if|switch|case|\?)\b/g) || []).length;
  score += Math.min(0.2, conditionals / 30 * 0.2);

  // Error handling complexity
  const tryCatch = (code.match(/\b(try|catch|throw)\b/g) || []).length;
  score += Math.min(0.15, tryCatch / 10 * 0.15);

  // Type complexity (generics, intersections, unions)
  const typeComplexity = (code.match(/<[^>]+>/g) || []).length;
  score += Math.min(0.15, typeComplexity / 15 * 0.15);

  return Math.min(1, score);
}

// ─── Main Extraction Function ────────────────────────────────────

/**
 * Compute all execution risk signals for a given file.
 *
 * @param filePath - The target file path
 * @param code - The generated code content
 * @param retryCount - Number of prior retry attempts (from payload)
 * @returns Full risk assessment with signals, composite score, and explanations
 */
export function computeExecutionRiskSignals(
  filePath: string,
  code: string,
  retryCount: number = 0,
): RiskAssessment {
  const signals: ExecutionRiskSignals = {
    import_density: extractImportDensity(code),
    dependency_fan_out: extractDependencyFanOut(code),
    auth_schema_sensitivity: detectAuthSchemaSensitivity(filePath, code),
    operational_sensitivity: computeOperationalSensitivity(filePath, code),
    has_reexport_pattern: detectReexportPattern(code),
    is_retry: retryCount > 0,
    content_complexity_estimate: estimateContentComplexity(code),
  };

  // ── Composite scoring ──
  // Weights reflect DX-1 findings about predictive strength
  const weights = {
    import_density: 0.15,        // high: strong predictor
    dependency_fan_out: 0.15,    // high: strong predictor
    auth_schema_sensitivity: 0.20, // high: outsized blast radius
    operational_sensitivity: 0.15, // medium: heuristic
    has_reexport_pattern: 0.10,  // high: cascade risk
    is_retry: 0.15,              // high: direct failure signal
    content_complexity_estimate: 0.10, // low-medium: rough heuristic
  };

  // Normalize signals to 0–1 for composite
  const normalizedImportDensity = Math.min(1, signals.import_density / 15);
  const normalizedFanOut = Math.min(1, signals.dependency_fan_out / 10);

  const composite =
    normalizedImportDensity * weights.import_density +
    normalizedFanOut * weights.dependency_fan_out +
    (signals.auth_schema_sensitivity ? 1 : 0) * weights.auth_schema_sensitivity +
    signals.operational_sensitivity * weights.operational_sensitivity +
    (signals.has_reexport_pattern ? 1 : 0) * weights.has_reexport_pattern +
    (signals.is_retry ? 1 : 0) * weights.is_retry +
    signals.content_complexity_estimate * weights.content_complexity_estimate;

  // ── Top factors explanation ──
  const top_factors: string[] = [];
  const weak_signals: string[] = [];

  if (signals.is_retry) top_factors.push("retry_attempt: prior execution failed");
  if (signals.auth_schema_sensitivity) top_factors.push("auth_schema: touches security-critical patterns");
  if (normalizedImportDensity > 0.5) top_factors.push(`high_import_density: ${signals.import_density} imports`);
  if (normalizedFanOut > 0.5) top_factors.push(`high_fan_out: ${signals.dependency_fan_out} unique modules`);
  if (signals.operational_sensitivity > 0.4) top_factors.push(`operational_sensitivity: infrastructure-critical patterns detected`);
  if (signals.has_reexport_pattern) top_factors.push("barrel_file: re-export hub with cascade risk");
  if (signals.content_complexity_estimate > 0.5) top_factors.push("high_complexity: deeply nested or async-heavy code");

  // Mark weak/inconclusive signals
  if (signals.content_complexity_estimate > 0 && signals.content_complexity_estimate < 0.3) {
    weak_signals.push("content_complexity: low confidence, rough heuristic");
  }
  if (signals.operational_sensitivity > 0 && signals.operational_sensitivity < 0.2) {
    weak_signals.push("operational_sensitivity: weak match, may be noise");
  }

  return {
    signals,
    composite_score: Math.round(composite * 1000) / 1000,
    top_factors,
    weak_signals,
  };
}
