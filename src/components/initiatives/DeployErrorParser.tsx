/**
 * DeployErrorParser — Unified Deploy Error Display
 *
 * Consumes pre-parsed error_suggestions from the deploy provider adapter
 * when available. Falls back to legacy client-side parsing for backward
 * compatibility with initiative records that lack adapter output.
 *
 * @integration deploy-provider.schema.ts → DeployErrorSuggestion
 */

import { ExternalLink, AlertTriangle, Info, XCircle } from "lucide-react";

// ── Unified suggestion shape (matches deploy-provider.schema.ts) ──
export interface DeployErrorSuggestionUnified {
  error_pattern: string;
  title: string;
  suggestion: string;
  doc_url: string | null;
  severity: "error" | "warning" | "info";
}

interface DeployErrorParserProps {
  /** Pre-parsed suggestions from deploy engine API response (preferred path) */
  errorSuggestions?: DeployErrorSuggestionUnified[] | null;
  /** Fallback: raw error code for legacy client-side parsing */
  errorCode?: string | null;
  /** Fallback: raw error message for legacy client-side parsing */
  errorMessage?: string | null;
  /** Fallback: raw build log for legacy client-side parsing */
  buildLog?: string | null;
}

/**
 * Legacy client-side error patterns — used ONLY when errorSuggestions
 * is not provided (backward compat for older initiative records).
 * @deprecated Prefer consuming adapter output via errorSuggestions prop.
 */
const LEGACY_ERROR_PATTERNS: Array<{
  pattern: RegExp;
  code: string;
  title: string;
  suggestion: string;
  docUrl: string;
}> = [
  { pattern: /VERCEL_TOKEN_MISSING/i, code: "VERCEL_TOKEN_MISSING", title: "Vercel token missing", suggestion: "Configure the VERCEL_TOKEN secret so AxionOS can deploy automatically and return a real online URL.", docUrl: "https://vercel.com/guides/how-do-i-use-a-vercel-api-access-token" },
  { pattern: /INVALID_VERCEL_CONFIG|invalid.*vercel\.json/i, code: "INVALID_VERCEL_CONFIG", title: "Invalid vercel.json configuration", suggestion: "Check your vercel.json syntax.", docUrl: "https://vercel.com/docs/projects/project-configuration" },
  { pattern: /BUILD_UTILS_SPAWN_\d+|command.*not found|npm.*ERR|ERESOLVE/i, code: "BUILD_COMMAND_FAILED", title: "Build command failed", suggestion: "Verify your buildCommand and ensure dependencies are listed. For npm peer conflicts, prefer --legacy-peer-deps instead of --force.", docUrl: "https://vercel.com/docs/deployments/builds#build-step" },
  { pattern: /FUNCTION_INVOCATION_TIMEOUT/i, code: "FUNCTION_TIMEOUT", title: "Serverless function timed out", suggestion: "Increase maxDuration in vercel.json.", docUrl: "https://vercel.com/docs/functions/runtimes#max-duration" },
  { pattern: /NO_OUTPUT_DIRECTORY|output.*directory.*not.*found/i, code: "NO_OUTPUT_DIRECTORY", title: "Output directory not found", suggestion: "Set the correct outputDirectory in vercel.json.", docUrl: "https://vercel.com/docs/projects/project-configuration#outputdirectory" },
  { pattern: /MODULE_NOT_FOUND|Cannot find module/i, code: "MODULE_NOT_FOUND", title: "Module not found during build", suggestion: "Ensure all imports resolve and dependencies are in package.json.", docUrl: "https://vercel.com/docs/deployments/troubleshoot-a-build#module-not-found" },
];

function legacyParse(errorCode?: string | null, errorMessage?: string | null, buildLog?: string | null): DeployErrorSuggestionUnified[] {
  const fullText = [errorCode, errorMessage, buildLog].filter(Boolean).join(" ");
  if (!fullText) return [];

  const suggestions: DeployErrorSuggestionUnified[] = [];
  const seen = new Set<string>();

  for (const entry of LEGACY_ERROR_PATTERNS) {
    if (entry.pattern.test(fullText) && !seen.has(entry.code)) {
      seen.add(entry.code);
      suggestions.push({
        error_pattern: entry.code,
        title: entry.title,
        suggestion: entry.suggestion,
        doc_url: entry.docUrl,
        severity: "error",
      });
    }
  }

  if (suggestions.length === 0 && fullText.length > 0) {
    suggestions.push({
      error_pattern: "UNKNOWN_DEPLOY_ERROR",
      title: "Unrecognized deployment error",
      suggestion: "Check the full build log for details.",
      doc_url: "https://vercel.com/docs/deployments/troubleshoot-a-build",
      severity: "warning",
    });
  }

  return suggestions;
}

export function DeployErrorParser({ errorSuggestions, errorCode, errorMessage, buildLog }: DeployErrorParserProps) {
  // Prefer adapter-provided suggestions; fall back to legacy parsing
  const suggestions = (errorSuggestions && errorSuggestions.length > 0)
    ? errorSuggestions
    : legacyParse(errorCode, errorMessage, buildLog);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => (
        <DeployErrorCard key={`${s.error_pattern}-${i}`} suggestion={s} />
      ))}
    </div>
  );
}

function DeployErrorCard({ suggestion }: { suggestion: DeployErrorSuggestionUnified }) {
  const Icon = suggestion.severity === "error" ? XCircle : suggestion.severity === "warning" ? AlertTriangle : Info;
  const borderClass =
    suggestion.severity === "error"
      ? "border-destructive/30 bg-destructive/5"
      : suggestion.severity === "warning"
        ? "border-yellow-500/30 bg-yellow-500/5"
        : "border-border bg-muted/30";

  return (
    <div className={`rounded-md border p-3 space-y-1.5 ${borderClass}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-destructive shrink-0" />
        <span className="text-xs font-mono font-semibold text-foreground">{suggestion.error_pattern}</span>
      </div>
      <p className="text-xs font-medium text-foreground">{suggestion.title}</p>
      <p className="text-xs text-muted-foreground">{suggestion.suggestion}</p>
      {suggestion.doc_url && (
        <a
          href={suggestion.doc_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Documentation
        </a>
      )}
    </div>
  );
}
