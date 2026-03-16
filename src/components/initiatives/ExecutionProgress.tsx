import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Cpu, Loader2, CheckCircle2, AlertTriangle, DollarSign, Zap, SkipForward, TrendingDown } from "lucide-react";

interface ExecutionProgressProps {
  initiativeId: string;
  stageStatus: string;
}

interface ValidationTrace {
  status?: string;
  total_artifacts?: number;
  approved?: number;
  escalated?: number;
  remaining?: number;
  current_artifact_id?: string | null;
  current_artifact_summary?: string | null;
  current_subtask_id?: string | null;
  current_phase?: string | null;
  current_attempt?: number;
  max_attempts?: number;
  issues_count?: number;
  combined_score?: number;
  last_issue_summary?: string | null;
  last_error?: string | null;
  last_result?: string | null;
}

interface ProgressData {
  current: number;
  total: number;
  percent: number;
  executed: number;
  failed: number;
  code_files: number;
  tokens: number;
  cost_usd: number;
  current_file: string | null;
  current_agent: string | null;
  current_subtask_id?: string | null;
  current_subtask_description?: string | null;
  current_story_id?: string | null;
  current_stage?: string | null;
  chain_of_agents: boolean;
  status: string;
  started_at?: string;
  completed_at?: string;
  incremental?: boolean;
  skipped?: number;
  savings_percent?: number;
  validation?: ValidationTrace | null;
}

const VALIDATION_PHASE_LABELS: Record<string, string> = {
  queued: "Na fila do Fix Loop",
  analysis: "Analisando artefato",
  reanalysis: "Revalidando após correção",
  fixing: "Corrigindo bloqueios",
  approved: "Aprovado automaticamente",
  escalated: "Escalado para revisão humana",
  awaiting_next_artifact: "Aguardando próximo artefato",
  completed: "Validação concluída",
  failed: "Validação falhou",
  no_artifacts: "Sem artefatos para validar",
};

export function ExecutionProgress({ initiativeId, stageStatus }: ExecutionProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      const { data } = await supabase
        .from("initiatives")
        .select("execution_progress")
        .eq("id", initiativeId)
        .single();
      if (data?.execution_progress && typeof data.execution_progress === "object") {
        setProgress(data.execution_progress as unknown as ProgressData);
      }
    };
    fetchProgress();

    const channel = supabase
      .channel(`execution-progress-${initiativeId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "initiatives",
          filter: `id=eq.${initiativeId}`,
        },
        (payload) => {
          const ep = payload.new?.execution_progress;
          if (ep && typeof ep === "object") {
            setProgress(ep as unknown as ProgressData);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [initiativeId]);

  if (!progress) return null;

  const activeStage = progress.current_stage || (stageStatus === "validating" ? "validation" : "execution");
  const validation = progress.validation || null;
  const isValidationRunning = activeStage === "validation" && validation?.status === "running";
  const hasTrackedExecution = Boolean(progress.total && progress.total > 0);
  if (!hasTrackedExecution && !isValidationRunning) return null;
  if (!["in_progress", "validating"].includes(stageStatus) && progress.status !== "completed" && !isValidationRunning) return null;

  const isRunning = progress.status === "running" || isValidationRunning;
  const isCompleted = progress.status === "completed" && !isValidationRunning;
  const hasIncremental = progress.incremental && (progress.skipped || 0) > 0;
  const validationPhaseLabel = validation?.current_phase ? VALIDATION_PHASE_LABELS[validation.current_phase] || validation.current_phase : null;
  const validationAttempt = validation?.current_attempt && validation.max_attempts
    ? `Tentativa ${validation.current_attempt}/${validation.max_attempts}`
    : null;

  return (
    <Card className={`border-border/50 ${isRunning ? "border-primary/30 bg-primary/5" : isCompleted ? "border-success/30 bg-success/5" : ""}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <Cpu className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {activeStage === "validation"
                ? isRunning ? "Fix Loop em andamento" : "Fix Loop concluído"
                : isRunning ? "Execução em andamento..." : isCompleted ? "Execução concluída" : "Progresso da Execução"}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {activeStage === "validation" ? "Fix Loop" : "Execution"}
            </Badge>
            {progress.chain_of_agents && activeStage !== "validation" && (
              <Badge variant="secondary" className="text-[10px]">Chain-of-Agents</Badge>
            )}
            {hasIncremental && activeStage !== "validation" && (
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                <SkipForward className="h-3 w-3 mr-1" />
                Incremental
              </Badge>
            )}
          </div>
          {hasTrackedExecution && (
            <span className="text-sm font-bold text-primary">{progress.percent}%</span>
          )}
        </div>

        {hasTrackedExecution && <Progress value={progress.percent} className="h-2" />}

        {hasIncremental && activeStage !== "validation" && (
          <div className="flex items-center gap-2 text-[11px] bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="text-emerald-300">
              <strong>{progress.skipped}</strong> arquivos reutilizados ({progress.savings_percent}% economia em tokens)
            </span>
          </div>
        )}

        <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
          {hasTrackedExecution && (
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {progress.current}/{progress.total} subtasks
            </span>
          )}
          {progress.code_files > 0 && activeStage !== "validation" && (
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {progress.code_files} gerados
            </span>
          )}
          {validation?.total_artifacts ? (
            <span>
              {validation.approved || 0}/{validation.total_artifacts} artefatos aprovados
            </span>
          ) : null}
          {validation?.remaining ? <span>{validation.remaining} restantes no Fix Loop</span> : null}
          {hasIncremental && activeStage !== "validation" && (
            <span className="flex items-center gap-1 text-emerald-400">
              <SkipForward className="h-3 w-3" />
              {progress.skipped} reusados
            </span>
          )}
          {progress.failed > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {progress.failed} falhas
            </span>
          )}
          {validation?.issues_count ? (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="h-3 w-3" />
              {validation.issues_count} bloqueios detectados
            </span>
          ) : null}
          {validation?.combined_score ? <span>score {validation.combined_score}/100</span> : null}
          {progress.tokens > 0 && <span>{progress.tokens.toLocaleString()} tokens</span>}
          {progress.cost_usd > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              ${progress.cost_usd.toFixed(4)}
            </span>
          )}
        </div>

        {activeStage === "execution" && isRunning && (progress.current_subtask_description || progress.current_file) && (
          <div className="rounded border border-border/50 bg-muted/30 px-3 py-2 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Subtask atual</p>
            {progress.current_subtask_description && (
              <p className="text-xs font-medium leading-relaxed">{progress.current_subtask_description}</p>
            )}
            {progress.current_file && (
              <p className="text-[11px] font-mono text-muted-foreground break-all">{progress.current_file}</p>
            )}
          </div>
        )}

        {activeStage === "validation" && validation && (
          <div className="rounded border border-border/50 bg-muted/30 px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Rastro do Fix Loop</p>
              <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                {validationPhaseLabel ? <span>{validationPhaseLabel}</span> : null}
                {validationAttempt ? <span>{validationAttempt}</span> : null}
              </div>
            </div>
            {validation.current_artifact_summary && (
              <p className="text-xs font-medium leading-relaxed">{validation.current_artifact_summary}</p>
            )}
            {validation.last_issue_summary && (
              <p className="text-[11px] text-destructive/90 leading-relaxed">Bloqueio atual: {validation.last_issue_summary}</p>
            )}
            {validation.last_error && (
              <p className="text-[11px] text-destructive/90 leading-relaxed">Erro: {validation.last_error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
