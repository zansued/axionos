// Error Taxonomy — AxionOS Sprint 6
// Typed error classification for repair-relevant failures.

import type { ErrorCategory } from "./repair-evidence.schema.ts";

// ══════════════════════════════════════════════════
//  ERROR TAXONOMY ENTRY
// ══════════════════════════════════════════════════

export interface ErrorTaxonomyEntry {
  category: ErrorCategory;
  code: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  repairable: boolean;
  examples: string[];
}

// ══════════════════════════════════════════════════
//  TAXONOMY REGISTRY
// ══════════════════════════════════════════════════

export const ERROR_TAXONOMY: ErrorTaxonomyEntry[] = [
  // TypeScript compilation
  {
    category: "typescript_error",
    code: "TS_GENERIC",
    description: "Generic TypeScript compilation error (TS2xxx, TS6xxx, etc.)",
    severity: "high",
    repairable: true,
    examples: ["TS2345: Argument of type X is not assignable", "TS2304: Cannot find name"],
  },
  {
    category: "typescript_error",
    code: "TS_TYPE_MISMATCH",
    description: "Type assignment or compatibility error",
    severity: "medium",
    repairable: true,
    examples: ["TS2322: Type X is not assignable to type Y"],
  },
  {
    category: "typescript_error",
    code: "TS_MISSING_PROPERTY",
    description: "Missing property on interface or object",
    severity: "medium",
    repairable: true,
    examples: ["TS2339: Property X does not exist on type Y"],
  },

  // Import / export
  {
    category: "import_error",
    code: "IMPORT_NOT_FOUND",
    description: "Import references a module or file that does not exist",
    severity: "high",
    repairable: true,
    examples: ["Cannot find module './Component'", "Could not resolve '@/lib/utils'"],
  },
  {
    category: "import_error",
    code: "EXPORT_MISSING",
    description: "Module exists but does not export the requested symbol",
    severity: "medium",
    repairable: true,
    examples: ["Module has no exported member 'Button'"],
  },

  // Dependencies
  {
    category: "dependency_error",
    code: "DEP_NOT_INSTALLED",
    description: "npm package referenced but not in package.json or node_modules",
    severity: "high",
    repairable: true,
    examples: ["Cannot find module 'lodash'", "Module not found: react-router-dom"],
  },
  {
    category: "dependency_error",
    code: "DEP_VERSION_CONFLICT",
    description: "Peer dependency or version resolution conflict",
    severity: "medium",
    repairable: true,
    examples: ["ERESOLVE: peer dep conflict", "Could not resolve dependency"],
  },

  // Schema / data model
  {
    category: "schema_error",
    code: "SCHEMA_MISMATCH",
    description: "Data model or database schema does not match code expectations",
    severity: "high",
    repairable: false,
    examples: ["Column 'xyz' does not exist", "Relation 'table' does not exist"],
  },

  // Runtime / build config
  {
    category: "runtime_error",
    code: "RUNTIME_CRASH",
    description: "Application crashes at runtime or during SSR/hydration",
    severity: "critical",
    repairable: false,
    examples: ["TypeError: Cannot read property of undefined", "ReferenceError"],
  },
  {
    category: "build_config_error",
    code: "CONFIG_MISSING",
    description: "Required config file missing (vite.config, tsconfig, etc.)",
    severity: "high",
    repairable: true,
    examples: ["Failed to load config from vite.config.ts", "ENOENT: tsconfig.json"],
  },
  {
    category: "build_config_error",
    code: "BUILD_SCRIPT_MISSING",
    description: "Build script not defined in package.json",
    severity: "high",
    repairable: true,
    examples: ["Missing npm script: build"],
  },
  {
    category: "build_config_error",
    code: "SYNTAX_ERROR",
    description: "JavaScript/TypeScript syntax error preventing compilation",
    severity: "high",
    repairable: true,
    examples: ["SyntaxError: Unexpected token", "Unterminated string literal"],
  },

  // Deploy
  {
    category: "deploy_error",
    code: "DEPLOY_BUILD_FAIL",
    description: "Deployment provider build step failed",
    severity: "critical",
    repairable: false,
    examples: ["Vercel build failed", "Build command exited with code 1"],
  },
  {
    category: "deploy_error",
    code: "DEPLOY_TIMEOUT",
    description: "Deployment timed out",
    severity: "high",
    repairable: false,
    examples: ["Deployment exceeded timeout"],
  },

  // Unknown
  {
    category: "unknown_error",
    code: "UNKNOWN",
    description: "Error could not be classified into a known category",
    severity: "medium",
    repairable: false,
    examples: ["Build failed with unrecognized error pattern"],
  },
];

// ══════════════════════════════════════════════════
//  LOOKUP HELPERS
// ══════════════════════════════════════════════════

/** Map a raw build-error category string to a taxonomy ErrorCategory */
export function classifyToTaxonomy(
  rawCategory: string,
  errorMessage: string,
): { category: ErrorCategory; code: string } {
  const catMap: Record<string, ErrorCategory> = {
    typescript: "typescript_error",
    import: "import_error",
    dependency: "dependency_error",
    entrypoint: "import_error",
    build: "build_config_error",
    build_script: "build_config_error",
    config_missing: "build_config_error",
    syntax_error: "build_config_error",
    unknown: "unknown_error",
  };

  const category = catMap[rawCategory] || "unknown_error";

  // Refine code based on message patterns
  if (category === "typescript_error") {
    if (errorMessage.includes("not assignable")) return { category, code: "TS_TYPE_MISMATCH" };
    if (errorMessage.includes("does not exist on type")) return { category, code: "TS_MISSING_PROPERTY" };
    return { category, code: "TS_GENERIC" };
  }
  if (category === "import_error") {
    if (errorMessage.includes("no exported member")) return { category, code: "EXPORT_MISSING" };
    return { category, code: "IMPORT_NOT_FOUND" };
  }
  if (category === "dependency_error") {
    if (errorMessage.includes("ERESOLVE") || errorMessage.includes("peer dep")) return { category, code: "DEP_VERSION_CONFLICT" };
    return { category, code: "DEP_NOT_INSTALLED" };
  }
  if (category === "build_config_error") {
    if (rawCategory === "syntax_error") return { category, code: "SYNTAX_ERROR" };
    if (rawCategory === "build_script") return { category, code: "BUILD_SCRIPT_MISSING" };
    if (rawCategory === "config_missing") return { category, code: "CONFIG_MISSING" };
    return { category, code: "CONFIG_MISSING" };
  }

  return { category, code: "UNKNOWN" };
}

/** Look up full taxonomy entry by code */
export function getTaxonomyEntry(code: string): ErrorTaxonomyEntry | undefined {
  return ERROR_TAXONOMY.find((e) => e.code === code);
}
