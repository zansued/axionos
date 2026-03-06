// Repair Strategy Map — AxionOS Sprint 6
// Deterministic, rule-based mapping from error types to repair strategies.

import type { ErrorCategory } from "../contracts/repair-evidence.schema.ts";

// ══════════════════════════════════════════════════
//  STRATEGY DEFINITION
// ══════════════════════════════════════════════════

export interface RepairStrategy {
  id: string;
  name: string;
  description: string;
  supported_categories: ErrorCategory[];
  approach: string;
  expected_file_types: string[];
  confidence: number; // 0–1
  auto_retry: boolean;
}

// ══════════════════════════════════════════════════
//  STRATEGY REGISTRY
// ══════════════════════════════════════════════════

export const REPAIR_STRATEGIES: RepairStrategy[] = [
  {
    id: "type_safe_patching",
    name: "Type-Safe Patching",
    description: "Fix TypeScript type errors by correcting type annotations, adding type assertions, or aligning interfaces",
    supported_categories: ["typescript_error"],
    approach: "Analyze TS error codes (TS2322, TS2345, etc.), inspect source and target types, generate minimal type-safe patch",
    expected_file_types: [".ts", ".tsx"],
    confidence: 0.75,
    auto_retry: true,
  },
  {
    id: "import_correction",
    name: "Import Correction",
    description: "Fix missing or broken import/export statements",
    supported_categories: ["import_error", "typescript_error"],
    approach: "Resolve correct module path, fix named vs default imports, create missing re-exports",
    expected_file_types: [".ts", ".tsx", ".js", ".jsx"],
    confidence: 0.85,
    auto_retry: true,
  },
  {
    id: "dependency_resolution",
    name: "Dependency Resolution",
    description: "Fix missing or conflicting npm dependencies",
    supported_categories: ["dependency_error"],
    approach: "Add missing packages to package.json, resolve peer dependency conflicts, normalize versions",
    expected_file_types: ["package.json"],
    confidence: 0.80,
    auto_retry: true,
  },
  {
    id: "config_repair",
    name: "Config File Repair",
    description: "Create or fix build configuration files (vite.config, tsconfig, etc.)",
    supported_categories: ["build_config_error"],
    approach: "Generate standard config templates, fix JSON syntax, ensure build scripts exist",
    expected_file_types: [".json", ".ts", ".js", ".mjs"],
    confidence: 0.90,
    auto_retry: true,
  },
  {
    id: "syntax_repair",
    name: "Syntax Repair",
    description: "Fix JavaScript/TypeScript syntax errors by replacing broken files with safe templates",
    supported_categories: ["build_config_error"],
    approach: "Parse error location, attempt minimal fix or replace file with safe functional template",
    expected_file_types: [".ts", ".tsx", ".js", ".jsx"],
    confidence: 0.60,
    auto_retry: true,
  },
  {
    id: "ai_contextual_patch",
    name: "AI Contextual Patch",
    description: "Use AI to generate a context-aware patch when deterministic strategies are insufficient",
    supported_categories: [
      "typescript_error", "import_error", "dependency_error",
      "build_config_error", "runtime_error", "unknown_error",
    ],
    approach: "Provide error context, file content, and project structure to AI for targeted patch generation",
    expected_file_types: [".ts", ".tsx", ".js", ".jsx", ".json"],
    confidence: 0.55,
    auto_retry: false,
  },
];

// ══════════════════════════════════════════════════
//  STRATEGY SELECTION
// ══════════════════════════════════════════════════

/**
 * Select the best repair strategy for a given error category and code.
 * Returns strategies sorted by confidence (highest first).
 */
export function selectRepairStrategies(
  category: ErrorCategory,
  _errorCode: string,
): RepairStrategy[] {
  return REPAIR_STRATEGIES
    .filter((s) => s.supported_categories.includes(category))
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get the primary (highest confidence) strategy for a category.
 */
export function getPrimaryStrategy(category: ErrorCategory): RepairStrategy {
  const strategies = selectRepairStrategies(category, "");
  return strategies[0] || REPAIR_STRATEGIES[REPAIR_STRATEGIES.length - 1]; // fallback to AI
}
