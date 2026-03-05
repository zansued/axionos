import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, Terminal,
  GitBranch, Clock, ExternalLink, RefreshCw, CheckCheck,
} from "lucide-react";

interface RuntimeValidationStatusProps {
  executionProgress: any;
  initiativeId?: string;
  onStatusUpdated?: () => void;
}

function useElapsedTime(startedAt: string | undefined, isActive: boolean) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startedAt || !isActive) { setElapsed(""); return; }

    const update = () => {
      const diff = Date.now() - new Date(startedAt).getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${mins}m ${secs}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt, isActive]);

  return elapsed;
}

export function RuntimeValidationStatus({ executionProgress, initiativeId, onStatusUpdated }: RuntimeValidationStatusProps) {
  const { toast } = useToast();
  const [marking, setMarking] = useState(false);
  const ep = executionProgress || {};
  const rtStatus = ep.runtime_validation_status;
  const ciStatus = ep.ci_status;
  const branch = ep.runtime_validation_branch;
  const commitSha = ep.runtime_validation_commit;
  const filesCount = ep.runtime_validation_files || 0;
  const startedAt = ep.runtime_validation_started_at;
  const ciErrors = ep.ci_errors || [];
  const ciBuildLog = ep.ci_build_log;
  const repoOwner = ep.runtime_validation_repo_owner;
  const repoName = ep.runtime_validation_repo_name;

  const isRunning = rtStatus === "running" && ciStatus !== "success" && ciStatus !== "failed";
  const passed = ciStatus === "success";
  const failed = ciStatus === "failed";

  const elapsed = useElapsedTime(startedAt, isRunning);

  if (!rtStatus && !ciStatus) return null;

  const isLong = startedAt && isRunning && (Date.now() - new Date(startedAt).getTime()) > 5 * 60 * 1000;

  const ghActionsUrl = repoOwner && repoName
    ? `https://github.com/${repoOwner}/${repoName}/actions`
    : null;

  const statusColor = passed ? "text-primary" : failed ? "text-destructive" : "text-accent-foreground";
  const StatusIcon = passed ? CheckCircle2 : failed ? XCircle : isRunning ? Loader2 : AlertTriangle;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            Runtime Validation (tsc + vite build)
          </CardTitle>
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${statusColor} ${isRunning ? "animate-spin" : ""}`} />
            <Badge
              variant={passed ? "default" : failed ? "destructive" : "secondary"}
              className="text-[10px]"
            >
              {passed ? "Build OK" : failed ? "Build Failed" : isRunning ? "CI Running..." : "Pendente"}
            </Badge>
          </div>
        </div>
        {isRunning && <Progress className="h-1.5 mt-2" value={undefined} />}
        {passed && <Progress className="h-1.5 mt-2" value={100} />}
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Branch info */}
        {branch && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5" />
            <span className="font-mono">{branch}</span>
            {commitSha && (
              <span className="font-mono text-[10px]">({commitSha.slice(0, 7)})</span>
            )}
          </div>
        )}

        {/* Timing */}
        {startedAt && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Iniciado em {new Date(startedAt).toLocaleString("pt-BR")}</span>
          </div>
        )}

        {/* Files count */}
        {filesCount > 0 && (
          <div className="text-muted-foreground">
            {filesCount} arquivos enviados para validação
          </div>
        )}

        {/* CI passed */}
        {passed && (
          <div className="flex items-center gap-2 rounded px-2 py-1.5 bg-primary/10">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-primary font-medium">
              npm install ✓ → tsc --noEmit ✓ → vite build ✓
            </span>
          </div>
        )}

        {/* CI failed — show errors */}
        {failed && ciErrors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-destructive font-medium flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" />
              {ciErrors.length} erro(s) encontrado(s):
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {ciErrors.slice(0, 15).map((err: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded px-2 py-1 bg-destructive/10 text-[11px]"
                >
                  <XCircle className="h-3 w-3 shrink-0 text-destructive mt-0.5" />
                  <div>
                    <span className="font-mono text-destructive">{err.file}</span>
                    {err.line && <span className="text-muted-foreground">:{err.line}</span>}
                    <span className="text-muted-foreground ml-1.5">{err.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Build log snippet */}
        {failed && ciBuildLog && (
          <details className="text-[10px]">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Ver build log
            </summary>
            <pre className="mt-1.5 p-2 rounded bg-muted/50 overflow-x-auto max-h-32 whitespace-pre-wrap font-mono">
              {ciBuildLog}
            </pre>
          </details>
        )}

        {/* Running state */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded px-2 py-1.5 bg-accent/50 text-accent-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span className="flex-1">GitHub Actions executando: npm install → tsc --noEmit → vite build...</span>
              {elapsed && (
                <span className="text-muted-foreground font-mono text-[10px] shrink-0">{elapsed}</span>
              )}
            </div>

            {isLong && (
              <div className="flex items-start gap-2 rounded px-2 py-1.5 bg-destructive/10 text-destructive text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  CI demorando mais que o esperado. Verifique se o secret <code className="font-mono bg-muted px-1 rounded">SYNKRAIOS_WEBHOOK_SECRET</code> está configurado no repositório GitHub (Settings → Secrets → Actions).
                </span>
              </div>
            )}

            {ghActionsUrl && (
              <a
                href={ghActionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Ver no GitHub Actions
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
