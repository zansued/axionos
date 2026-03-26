/**
 * Sprint 74 — Edge Function Import Governance
 * 
 * Prevents regressions to legacy/unstable import patterns:
 * - esm.sh CDN imports
 * - deno.land/x third-party imports (use npm: instead)
 * - deno.land/std imports (use jsr:@std or Deno native APIs)
 * - Legacy `import { serve }` pattern (use Deno.serve() native)
 */

// ═══════════════════════════════════════════════════════════════
// Prohibited Patterns
// ═══════════════════════════════════════════════════════════════

export interface ImportViolation {
  line: number;
  statement: string;
  rule: string;
  severity: "error" | "warning";
  suggestion: string;
}

export interface GovernanceResult {
  valid: boolean;
  violations: ImportViolation[];
  summary: string;
}

const RULES: Array<{
  pattern: RegExp;
  rule: string;
  severity: "error" | "warning";
  suggestion: string;
}> = [
  {
    pattern: /from\s+["']https:\/\/esm\.sh\//,
    rule: "no-esm-sh",
    severity: "error",
    suggestion: 'Use npm: specifier instead. Example: import { x } from "npm:package@version"',
  },
  {
    pattern: /from\s+["']https:\/\/deno\.land\/x\//,
    rule: "no-deno-land-x",
    severity: "error",
    suggestion: 'Use npm: specifier instead. Example: import { z } from "npm:zod@3.23.8"',
  },
  {
    pattern: /from\s+["']https:\/\/deno\.land\/std/,
    rule: "no-deno-land-std",
    severity: "error",
    suggestion: 'Use jsr:@std/ specifier or Deno native APIs. Example: jsr:@std/assert@0.224',
  },
  {
    pattern: /import\s*\{\s*serve\s*\}\s*from/,
    rule: "no-legacy-serve",
    severity: "error",
    suggestion: "Use Deno.serve() native API directly — no import needed.",
  },
  {
    pattern: /from\s+["']https:\/\/cdn\.skypack\.dev\//,
    rule: "no-skypack",
    severity: "error",
    suggestion: 'Use npm: specifier instead.',
  },
  {
    pattern: /from\s+["']https:\/\/unpkg\.com\//,
    rule: "no-unpkg",
    severity: "error",
    suggestion: 'Use npm: specifier instead.',
  },
];

// ═══════════════════════════════════════════════════════════════
// Validator
// ═══════════════════════════════════════════════════════════════

/**
 * Validates a single edge function file against import governance rules.
 * Ignores lines that are inside string literals used as prompt templates
 * (heuristic: lines containing backtick or preceded by template markers).
 */
export function validateEdgeImports(
  code: string,
  filePath?: string,
): GovernanceResult {
  const lines = code.split("\n");
  const violations: ImportViolation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

    // Skip lines inside template literals (prompt strings) — heuristic:
    // if the line doesn't start with 'import' and doesn't contain 'from', skip
    const isImportLine = trimmed.startsWith("import ") || /^\}\s*from\s+/.test(trimmed);
    
    for (const rule of RULES) {
      if (rule.pattern.test(trimmed)) {
        // Only flag actual import statements, not references in string prompts
        // Heuristic: if it's an actual import line OR the pattern is very specific
        if (isImportLine || rule.rule === "no-legacy-serve") {
          violations.push({
            line: i + 1,
            statement: trimmed.slice(0, 120),
            rule: rule.rule,
            severity: rule.severity,
            suggestion: rule.suggestion,
          });
        }
      }
    }
  }

  const errorCount = violations.filter(v => v.severity === "error").length;
  const valid = errorCount === 0;

  const summary = valid
    ? `✅ ${filePath || "file"}: No import governance violations`
    : `❌ ${filePath || "file"}: ${errorCount} violation(s) found`;

  return { valid, violations, summary };
}

/**
 * Validates multiple files and returns aggregate results.
 */
export function validateEdgeImportsBatch(
  files: Array<{ path: string; content: string }>,
): { valid: boolean; results: Array<{ path: string; result: GovernanceResult }> } {
  const results = files.map(f => ({
    path: f.path,
    result: validateEdgeImports(f.content, f.path),
  }));

  const valid = results.every(r => r.result.valid);
  return { valid, results };
}

// ═══════════════════════════════════════════════════════════════
// Canonical Import Templates (for code generation)
// ═══════════════════════════════════════════════════════════════

export const CANONICAL_EDGE_FUNCTION_TEMPLATE = `// Edge Function — AxionOS Canonical Pattern
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Function logic here
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
`;

/**
 * Returns the governance rules as a prompt-injectable string
 * for AI code generation guardrails.
 */
export function getEdgeImportGuardrailPrompt(): string {
  return `EDGE FUNCTION IMPORT GOVERNANCE (mandatory):
- Use Deno.serve() native API — do NOT import serve from any URL
- Use "npm:@supabase/supabase-js@2" — do NOT use esm.sh or deno.land URLs
- Use "npm:<package>@<version>" for third-party packages (e.g., npm:zod@3.23.8)
- Use "jsr:@std/<module>@<version>" for Deno standard library
- NEVER import from esm.sh, deno.land/x, cdn.skypack.dev, or unpkg.com
- Use ReturnType<typeof createClient> for Supabase client typing`;
}
