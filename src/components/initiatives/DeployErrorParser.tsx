/**
 * DeployErrorParser — Pretty Error Parser for deploy logs
 *
 * Parses Vercel deploy errors and shows actionable suggestions
 * with direct links to documentation.
 */

import { ExternalLink, AlertTriangle, Info, XCircle } from "lucide-react";
import { parseDeployError, type DeployErrorSuggestion } from "@/lib/vercel-deploy-intelligence";

interface DeployErrorParserProps {
  errorCode?: string | null;
  errorMessage?: string | null;
  buildLog?: string | null;
}

export function DeployErrorParser({ errorCode, errorMessage, buildLog }: DeployErrorParserProps) {
  const fullText = [errorCode, errorMessage, buildLog].filter(Boolean).join(" ");
  if (!fullText) return null;

  const suggestions = parseDeployError(fullText);
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      {suggestions.map((s) => (
        <DeployErrorCard key={s.errorCode} suggestion={s} />
      ))}
    </div>
  );
}

function DeployErrorCard({ suggestion }: { suggestion: DeployErrorSuggestion }) {
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
        <span className="text-xs font-mono font-semibold text-foreground">{suggestion.errorCode}</span>
      </div>
      <p className="text-xs font-medium text-foreground">{suggestion.title}</p>
      <p className="text-xs text-muted-foreground">{suggestion.suggestion}</p>
      <a
        href={suggestion.docUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Vercel Docs
      </a>
    </div>
  );
}
