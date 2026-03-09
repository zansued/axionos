import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, XCircle, Clock, Loader2, RotateCcw,
  Layers, Database, Globe, GitBranch, Sparkles, AlertTriangle, Ban,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubjobRow {
  id: string;
  job_id: string;
  subjob_key: string;
  status: string;
  error: string | null;
  model_used: string | null;
  tokens_used: number;
  cost_usd: number;
  duration_ms: number;
  attempt_number: number;
  max_attempts: number;
  started_at: string | null;
  completed_at: string | null;
}

const SUBJOB_META: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  "architecture.system": { label: "System Architect", icon: Layers, description: "Stack, camadas e estrutura" },
  "architecture.data": { label: "Data Architect", icon: Database, description: "Modelo de dados e banco" },
  "architecture.api": { label: "API Architect", icon: Globe, description: "Contratos e endpoints" },
  "architecture.dependencies": { label: "Dependency Planner", icon: GitBranch, description: "Grafo de dependências" },
  "architecture.synthesis": { label: "Synthesis", icon: Sparkles, description: "Consolidação final" },
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  queued: { color: "bg-muted text-muted-foreground", icon: Clock, label: "Aguardando" },
  running: { color: "bg-warning/20 text-warning", icon: Loader2, label: "Executando" },
  completed: { color: "bg-accent/20 text-accent", icon: CheckCircle2, label: "Concluído" },
  failed: { color: "bg-destructive/20 text-destructive", icon: XCircle, label: "Falhou" },
  failed_timeout: { color: "bg-destructive/20 text-destructive", icon: AlertTriangle, label: "Timeout" },
  retryable: { color: "bg-warning/20 text-warning", icon: RotateCcw, label: "Retentável" },
  blocked: { color: "bg-muted text-muted-foreground", icon: Ban, label: "Bloqueado" },
};

interface ArchitectureSubjobsPanelProps {
  initiativeId: string;
  jobId?: string | null;
}

export function ArchitectureSubjobsPanel({ initiativeId, jobId }: ArchitectureSubjobsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [retryingKey, setRetryingKey] = useState<string | null>(null);

  const { data: subjobs = [], isLoading } = useQuery({
    queryKey: ["architecture-subjobs", initiativeId, jobId],
    queryFn: async () => {
      let query = supabase
        .from("pipeline_subjobs")
        .select("*")
        .eq("initiative_id", initiativeId)
        .eq("stage", "architecture")
        .order("created_at", { ascending: true });

      if (jobId) query = query.eq("job_id", jobId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SubjobRow[];
    },
    enabled: !!initiativeId,
    refetchInterval: 5000, // poll while architecture is running
  });

  const retryMutation = useMutation({
    mutationFn: async ({ subjobKey, targetJobId }: { subjobKey: string; targetJobId: string }) => {
      const { data, error } = await supabase.functions.invoke("architecture-subjob-retry", {
        body: { initiativeId, subjobKey, jobId: targetJobId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      toast({ title: "Retry iniciado", description: `Subjob ${vars.subjobKey} sendo re-executado.` });
      queryClient.invalidateQueries({ queryKey: ["architecture-subjobs", initiativeId] });
      setRetryingKey(null);
    },
    onError: (err: any) => {
      toast({ title: "Erro no retry", description: err.message, variant: "destructive" });
      setRetryingKey(null);
    },
  });

  if (isLoading || subjobs.length === 0) return null;

  const completedCount = subjobs.filter(s => s.status === "completed").length;
  const totalCount = subjobs.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const allComplete = completedCount === totalCount;
  const hasFailed = subjobs.some(s => s.status === "failed" || s.status === "failed_timeout");
  const totalTokens = subjobs.reduce((sum, s) => sum + (s.tokens_used || 0), 0);
  const totalCost = subjobs.reduce((sum, s) => sum + Number(s.cost_usd || 0), 0);
  const totalDuration = subjobs.reduce((sum, s) => sum + (s.duration_ms || 0), 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Architecture Subjobs
          </CardTitle>
          <div className="flex items-center gap-2">
            {allComplete && (
              <Badge variant="outline" className="bg-accent/10 text-accent text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Síntese Pronta
              </Badge>
            )}
            {hasFailed && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" /> Falha Parcial
              </Badge>
            )}
          </div>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{completedCount}/{totalCount} subjobs</span>
          {totalTokens > 0 && <span>{totalTokens} tokens · ${totalCost.toFixed(4)} · {(totalDuration / 1000).toFixed(1)}s</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {subjobs.map((subjob) => {
          const meta = SUBJOB_META[subjob.subjob_key] || { label: subjob.subjob_key, icon: Layers, description: "" };
          const statusConf = STATUS_CONFIG[subjob.status] || STATUS_CONFIG.queued;
          const Icon = meta.icon;
          const StatusIcon = statusConf.icon;
          const canRetry = ["failed", "failed_timeout", "retryable"].includes(subjob.status) && subjob.attempt_number < subjob.max_attempts;
          const isRetrying = retryingKey === subjob.subjob_key;

          return (
            <div key={subjob.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{meta.label}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusConf.color}`}>
                    <StatusIcon className={`h-2.5 w-2.5 mr-0.5 ${subjob.status === "running" ? "animate-spin" : ""}`} />
                    {statusConf.label}
                  </Badge>
                  {subjob.attempt_number > 1 && (
                    <span className="text-[10px] text-muted-foreground">
                      tentativa {subjob.attempt_number}/{subjob.max_attempts}
                    </span>
                  )}
                </div>
                {subjob.error && (
                  <p className="text-[11px] text-destructive mt-0.5 truncate" title={subjob.error}>
                    {subjob.error.slice(0, 100)}
                  </p>
                )}
                {subjob.status === "completed" && (subjob.tokens_used > 0 || subjob.duration_ms > 0) && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {subjob.model_used && `${subjob.model_used} · `}
                    {subjob.tokens_used} tokens · ${Number(subjob.cost_usd).toFixed(4)} · {(subjob.duration_ms / 1000).toFixed(1)}s
                  </p>
                )}
              </div>
              {canRetry && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  disabled={isRetrying || retryMutation.isPending}
                  onClick={() => {
                    setRetryingKey(subjob.subjob_key);
                    retryMutation.mutate({ subjobKey: subjob.subjob_key, targetJobId: subjob.job_id });
                  }}
                >
                  {isRetrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  <span className="ml-1">Retry</span>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
