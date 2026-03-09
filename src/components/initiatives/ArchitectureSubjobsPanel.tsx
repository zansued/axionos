import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, XCircle, Clock, Loader2, RotateCcw,
  Layers, Database, Globe, GitBranch, Sparkles, AlertTriangle, Ban,
  ChevronDown, ChevronRight, Activity, Zap, FileWarning,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AttemptDiag {
  attempt_number: number;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  model: string | null;
  prompt_size_chars: number;
  context_size_chars: number;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  provider_latency_ms: number | null;
  parse_ms: number | null;
  persist_ms: number | null;
  parse_status: string;
  persist_status: string;
  terminal_status: string;
  failure_type: string | null;
  failure_reason: string | null;
  retry_trigger: string | null;
}

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
  failure_type: string | null;
  diagnostics_log: AttemptDiag[] | null;
  prompt_size_chars: number | null;
  context_size_chars: number | null;
  retry_trigger: string | null;
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
  completed: { color: "bg-green-500/20 text-green-700 dark:text-green-400", icon: CheckCircle2, label: "Concluído" },
  failed: { color: "bg-destructive/20 text-destructive", icon: XCircle, label: "Falhou" },
  failed_timeout: { color: "bg-destructive/20 text-destructive", icon: AlertTriangle, label: "Timeout" },
  retryable: { color: "bg-warning/20 text-warning", icon: RotateCcw, label: "Retentável" },
  blocked: { color: "bg-muted text-muted-foreground", icon: Ban, label: "Bloqueado" },
};

const FAILURE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  failed_timeout: { label: "Timeout", color: "text-warning" },
  failed_provider: { label: "Provider Error", color: "text-destructive" },
  failed_parse: { label: "Parse Error", color: "text-orange-400" },
  failed_persistence: { label: "DB Error", color: "text-destructive" },
  failed_cleanup: { label: "Cleanup Error", color: "text-muted-foreground" },
  failed_unknown: { label: "Unknown", color: "text-muted-foreground" },
};

interface ArchitectureSubjobsPanelProps {
  initiativeId: string;
  jobId?: string | null;
}

export function ArchitectureSubjobsPanel({ initiativeId, jobId }: ArchitectureSubjobsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [retryingKey, setRetryingKey] = useState<string | null>(null);
  const [expandedSubjob, setExpandedSubjob] = useState<string | null>(null);
  const [showBottlenecks, setShowBottlenecks] = useState(false);

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
      return (data || []) as unknown as SubjobRow[];
    },
    enabled: !!initiativeId,
    refetchInterval: 5000,
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
  const totalRetries = subjobs.reduce((sum, s) => sum + Math.max(0, (s.attempt_number || 1) - 1), 0);

  // Bottleneck analysis
  const bottlenecks = computeBottlenecks(subjobs);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Architecture Subjobs
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalRetries > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning text-[10px]">
                <RotateCcw className="h-2.5 w-2.5 mr-0.5" /> {totalRetries} retries
              </Badge>
            )}
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
          const isExpanded = expandedSubjob === subjob.id;
          const diagLogs = Array.isArray(subjob.diagnostics_log) ? subjob.diagnostics_log : [];
          const hasAttemptHistory = diagLogs.length > 0;
          const failureInfo = subjob.failure_type ? FAILURE_TYPE_LABELS[subjob.failure_type] : null;

          return (
            <div key={subjob.id} className="rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 p-2">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{meta.label}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusConf.color}`}>
                      <StatusIcon className={`h-2.5 w-2.5 mr-0.5 ${subjob.status === "running" ? "animate-spin" : ""}`} />
                      {statusConf.label}
                    </Badge>
                    {failureInfo && (
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${failureInfo.color}`}>
                        <FileWarning className="h-2.5 w-2.5 mr-0.5" />
                        {failureInfo.label}
                      </Badge>
                    )}
                    {subjob.attempt_number > 1 && (
                      <span className="text-[10px] text-muted-foreground">
                        tentativa {subjob.attempt_number}/{subjob.max_attempts}
                      </span>
                    )}
                  </div>
                  {/* Retry cause */}
                  {subjob.retry_trigger && subjob.attempt_number > 1 && (
                    <p className="text-[10px] text-warning mt-0.5">
                      ⟳ Retry: {subjob.retry_trigger === "auto_timeout" ? "auto (timeout)" : subjob.retry_trigger === "auto_parse" ? "auto (parse error)" : "manual"}
                    </p>
                  )}
                  {subjob.error && (
                    <p className="text-[11px] text-destructive mt-0.5 truncate" title={subjob.error}>
                      {subjob.error.slice(0, 100)}
                    </p>
                  )}
                  {subjob.status === "completed" && (subjob.tokens_used > 0 || subjob.duration_ms > 0) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {subjob.model_used && `${subjob.model_used} · `}
                      {subjob.tokens_used} tokens · ${Number(subjob.cost_usd).toFixed(4)} · {(subjob.duration_ms / 1000).toFixed(1)}s
                      {(subjob.prompt_size_chars || 0) > 0 && ` · prompt: ${Math.ceil((subjob.prompt_size_chars || 0) / 1000)}k chars`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {hasAttemptHistory && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setExpandedSubjob(isExpanded ? null : subjob.id)}
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                  )}
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
              </div>

              {/* Attempt History (expanded) */}
              {isExpanded && hasAttemptHistory && (
                <div className="px-2 pb-2 space-y-1 border-t border-border/30 pt-1.5 ml-7">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                    Attempt History
                  </p>
                  {diagLogs.map((diag, i) => (
                    <div key={i} className={`text-[10px] p-1.5 rounded ${diag.failure_type ? "bg-destructive/5" : "bg-accent/5"}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">#{diag.attempt_number}</span>
                        <span>{(diag.duration_ms / 1000).toFixed(1)}s</span>
                        {diag.model && <span className="text-muted-foreground">{diag.model}</span>}
                        <span className={diag.parse_status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                          parse: {diag.parse_status}
                        </span>
                        <span className={diag.persist_status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                          persist: {diag.persist_status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-muted-foreground mt-0.5">
                        {diag.provider_latency_ms != null && <span>provider: {(diag.provider_latency_ms / 1000).toFixed(1)}s</span>}
                        {diag.parse_ms != null && diag.parse_ms > 0 && <span>parse: {diag.parse_ms}ms</span>}
                        {diag.persist_ms != null && diag.persist_ms > 0 && <span>persist: {diag.persist_ms}ms</span>}
                        {diag.estimated_input_tokens > 0 && (
                          <span>in: ~{diag.estimated_input_tokens}t · out: ~{diag.estimated_output_tokens}t</span>
                        )}
                      </div>
                      {diag.failure_reason && (
                        <p className="text-destructive mt-0.5 truncate" title={diag.failure_reason}>
                          {diag.failure_type && <span className="font-medium">[{diag.failure_type}] </span>}
                          {diag.failure_reason.slice(0, 120)}
                        </p>
                      )}
                      {diag.retry_trigger && (
                        <p className="text-warning mt-0.5">→ retry: {diag.retry_trigger}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Bottleneck Analysis */}
        {(hasFailed || allComplete || totalRetries > 0) && bottlenecks && (
          <Collapsible open={showBottlenecks} onOpenChange={setShowBottlenecks}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs justify-between mt-1">
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  Diagnosis & Bottlenecks
                </span>
                {showBottlenecks ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-1.5">
              {bottlenecks.likely_bottlenecks.length > 0 && (
                <div className="p-2 rounded bg-warning/5 border border-warning/20">
                  <p className="text-[10px] font-medium text-warning mb-1">⚠ Bottlenecks Detected</p>
                  {bottlenecks.likely_bottlenecks.map((b, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">• {b}</p>
                  ))}
                </div>
              )}

              {bottlenecks.longest_stages.length > 0 && (
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-[10px] font-medium mb-1 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Slowest Stages
                  </p>
                  {bottlenecks.longest_stages.map((s, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">
                      {s.subjob}: {(s.duration_ms / 1000).toFixed(1)}s
                    </p>
                  ))}
                </div>
              )}

              {bottlenecks.largest_prompts.length > 0 && (
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-[10px] font-medium mb-1">📏 Largest Prompts</p>
                  {bottlenecks.largest_prompts.map((p, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">
                      {p.subjob}: ~{p.est_tokens} tokens ({Math.ceil(p.chars / 1000)}k chars)
                    </p>
                  ))}
                </div>
              )}

              {Object.keys(bottlenecks.failure_type_counts).length > 0 && (
                <div className="p-2 rounded bg-destructive/5 border border-destructive/20">
                  <p className="text-[10px] font-medium mb-1">🔴 Failure Distribution</p>
                  {Object.entries(bottlenecks.failure_type_counts).map(([type, count]) => (
                    <p key={type} className="text-[10px] text-muted-foreground">
                      {FAILURE_TYPE_LABELS[type]?.label || type}: {count}x
                    </p>
                  ))}
                </div>
              )}

              <div className="p-2 rounded bg-primary/5 border border-primary/20">
                <p className="text-[10px] font-medium text-primary mb-1">💡 Recommended Action</p>
                <p className="text-[10px] text-muted-foreground">{bottlenecks.recommended_next_action}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Client-side bottleneck analysis ───
function computeBottlenecks(subjobs: SubjobRow[]) {
  const failureCounts: Record<string, number> = {};
  let totalRetries = 0;

  for (const s of subjobs) {
    totalRetries += Math.max(0, (s.attempt_number || 1) - 1);
    const logs = Array.isArray(s.diagnostics_log) ? s.diagnostics_log : [];
    for (const log of logs) {
      if (log.failure_type) {
        failureCounts[log.failure_type] = (failureCounts[log.failure_type] || 0) + 1;
      }
    }
    if (s.failure_type) {
      failureCounts[s.failure_type] = (failureCounts[s.failure_type] || 0) + 1;
    }
  }

  const bottlenecks: string[] = [];

  const promptSizes = subjobs
    .filter(s => (s.prompt_size_chars || 0) > 0)
    .map(s => ({ subjob: s.subjob_key, chars: s.prompt_size_chars || 0, est_tokens: Math.ceil((s.prompt_size_chars || 0) / 4) }))
    .sort((a, b) => b.chars - a.chars);

  const durations = subjobs
    .filter(s => (s.duration_ms || 0) > 0)
    .map(s => ({ subjob: s.subjob_key, duration_ms: s.duration_ms || 0 }))
    .sort((a, b) => b.duration_ms - a.duration_ms);

  if (promptSizes.length > 0 && promptSizes[0].est_tokens > 3000) {
    bottlenecks.push(`Large prompt: ${promptSizes[0].subjob} (~${promptSizes[0].est_tokens} tokens)`);
  }
  if (durations.length > 0 && durations[0].duration_ms > 60000) {
    bottlenecks.push(`Slow stage: ${durations[0].subjob} (${(durations[0].duration_ms / 1000).toFixed(1)}s)`);
  }
  if (totalRetries > 2) {
    bottlenecks.push(`High retry count: ${totalRetries} retries`);
  }

  const sortedFailures = Object.entries(failureCounts).sort((a, b) => b[1] - a[1]);
  const mostFrequent = sortedFailures.length > 0 ? sortedFailures[0][0] : null;

  if (mostFrequent === "failed_timeout") bottlenecks.push("Timeouts are the primary failure mode");
  else if (mostFrequent === "failed_parse") bottlenecks.push("JSON parse failures — model output quality issue");
  else if (mostFrequent === "failed_provider") bottlenecks.push("Provider errors — rate limiting or service degradation");

  let recommendation = "Pipeline is healthy — no immediate action needed.";
  if (mostFrequent === "failed_timeout") {
    recommendation = "Increase timeouts or compress prompts. Check provider latency.";
  } else if (mostFrequent === "failed_parse") {
    recommendation = "Add structured output hints or switch to a model with better JSON adherence.";
  } else if (mostFrequent === "failed_provider") {
    recommendation = "Check provider status. Consider fallback provider or circuit breaker.";
  } else if (totalRetries > 3) {
    recommendation = "Retry storm detected. Review root cause before increasing retry limits.";
  } else if (promptSizes.length > 0 && promptSizes[0].est_tokens > 4000) {
    recommendation = "Largest prompt exceeds 4k tokens. Use compact context summaries.";
  }

  return {
    likely_bottlenecks: bottlenecks,
    largest_prompts: promptSizes.slice(0, 3),
    longest_stages: durations.slice(0, 3),
    most_frequent_failure_type: mostFrequent,
    failure_type_counts: failureCounts,
    recommended_next_action: recommendation,
    total_retries: totalRetries,
  };
}
