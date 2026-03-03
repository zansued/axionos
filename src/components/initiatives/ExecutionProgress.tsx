import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Cpu, Loader2, CheckCircle2, AlertTriangle, DollarSign, Zap } from "lucide-react";

interface ExecutionProgressProps {
  initiativeId: string;
  stageStatus: string;
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
  chain_of_agents: boolean;
  status: string;
  started_at?: string;
  completed_at?: string;
}

export function ExecutionProgress({ initiativeId, stageStatus }: ExecutionProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    // Fetch initial progress
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

    // Subscribe to realtime updates
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

  // Only show during or after execution
  if (!progress || !progress.total || progress.total === 0) return null;
  if (stageStatus !== "in_progress" && progress.status !== "completed") return null;

  const isRunning = progress.status === "running";
  const isCompleted = progress.status === "completed";

  return (
    <Card className={`border-border/50 ${isRunning ? "border-primary/30 bg-primary/5" : isCompleted ? "border-success/30 bg-success/5" : ""}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <Cpu className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {isRunning ? "Execução em andamento..." : isCompleted ? "Execução concluída" : "Progresso da Execução"}
            </span>
            {progress.chain_of_agents && (
              <Badge variant="secondary" className="text-[10px]">Chain-of-Agents</Badge>
            )}
          </div>
          <span className="text-sm font-bold text-primary">{progress.percent}%</span>
        </div>

        {/* Progress bar */}
        <Progress value={progress.percent} className="h-2" />

        {/* Stats */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {progress.current}/{progress.total} subtasks
          </span>
          {progress.code_files > 0 && (
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {progress.code_files} arquivos
            </span>
          )}
          {progress.failed > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {progress.failed} falhas
            </span>
          )}
          {progress.tokens > 0 && (
            <span>{progress.tokens.toLocaleString()} tokens</span>
          )}
          {progress.cost_usd > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              ${progress.cost_usd.toFixed(4)}
            </span>
          )}
        </div>

        {/* Current file indicator */}
        {isRunning && progress.current_file && (
          <div className="text-[11px] text-muted-foreground bg-muted/30 rounded px-2 py-1 font-mono truncate">
            → {progress.current_file}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
