/**
 * OX-6: Execution Metrics Contract
 * 
 * Defines the structured metrics payload logged per worker execution
 * for data-driven policy tuning of the fast-path eligibility.
 */

import type { IntegrationSeverity } from "./integration-severity.ts";

export interface ExecutionMetrics {
  /** Which path was used */
  path: "fast_2call" | "safe_3call";
  /** File type classification */
  file_type: string | null;
  /** Wave number in the execution DAG */
  wave: number;
  /** Total context length in chars */
  context_length: number;

  // ── Performance ──
  /** Total AI latency across all calls */
  latency_ms: number;
  /** Number of AI calls made */
  ai_calls: number;

  // ── Cost ──
  /** Total tokens consumed */
  tokens_used: number;
  /** Estimated cost in USD */
  cost_usd: number;

  // ── Quality ──
  /** How much the Integration Agent changed the code */
  integration_severity: IntegrationSeverity;
  /** Edit ratio (0-1) between pre and post integration */
  integration_edit_ratio: number;
  /** Output size in chars */
  output_size: number;

  // ── Routing ──
  /** Why this path was chosen */
  fast_path_reason: string;
  /** Risk tier from eligibility evaluation */
  risk_tier: "low" | "medium" | "high";

  // ── Reliability ──
  /** Number of retries attempted */
  retry_count: number;
}

export interface ValidationSignals {
  /** Whether import paths appear resolvable */
  import_resolution_ok: boolean;
  /** Whether the output is syntactically valid (basic check) */
  syntax_valid: boolean;
  /** Whether integration agent passed without major changes */
  integration_passed: boolean;
}

/**
 * Basic syntax validation: checks for common structural issues.
 * Not a full parser — just catches obvious generation failures.
 */
export function validateSyntax(code: string, ext: string): boolean {
  if (!code || code.length < 10) return false;

  // Check balanced braces for JS/TS files
  if (["ts", "tsx", "js", "jsx"].includes(ext)) {
    let braceCount = 0;
    for (const ch of code) {
      if (ch === "{") braceCount++;
      if (ch === "}") braceCount--;
      if (braceCount < 0) return false;
    }
    return braceCount === 0;
  }

  // SQL: check for basic statement structure
  if (ext === "sql") {
    const upper = code.toUpperCase();
    return upper.includes("CREATE") || upper.includes("ALTER") || upper.includes("INSERT") || upper.includes("SELECT");
  }

  // JSON: try parsing
  if (ext === "json") {
    try { JSON.parse(code); return true; } catch { return false; }
  }

  return true; // default pass for other types
}

/**
 * Basic import resolution check: verifies that import paths
 * don't reference obviously broken paths.
 */
export function validateImports(code: string, knownPaths: string[]): boolean {
  const importRegex = /from\s+["'](@\/[^"']+|\.\.?\/[^"']+)["']/g;
  let match;
  const knownSet = new Set(knownPaths);

  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1];
    // Skip node_modules / package imports (already handled by package.json)
    if (!importPath.startsWith(".") && !importPath.startsWith("@/")) continue;
    // For relative imports starting with @/, check against known project paths
    if (importPath.startsWith("@/")) {
      const resolved = "src/" + importPath.slice(2);
      // Check with common extensions
      const found = [resolved, `${resolved}.ts`, `${resolved}.tsx`, `${resolved}/index.ts`, `${resolved}/index.tsx`]
        .some(p => knownSet.has(p));
      if (!found && knownPaths.length > 0) {
        // Only fail if we have known paths to compare against
        return false;
      }
    }
  }
  return true;
}

/**
 * OX-6: Fast-path policy learning data structure.
 * Prepared for future adaptive heuristics (no ML yet).
 */
export interface FastPathPolicyRecord {
  file_type: string | null;
  context_length: number;
  wave: number;
  /** Number of import statements in the file */
  import_density: number;
  /** Historical fix rate for this file type (0-1) */
  historical_fix_rate: number;
  /** Which path was used */
  path_used: "fast_2call" | "safe_3call";
  /** Outcome: did it need major fixes? */
  needed_major_fix: boolean;
  /** Outcome: did validation pass? */
  validation_passed: boolean;
  /** Timestamp */
  recorded_at: string;
}

/**
 * Count import statements in code for import_density metric.
 */
export function countImports(code: string): number {
  const matches = code.match(/^import\s/gm);
  return matches ? matches.length : 0;
}
