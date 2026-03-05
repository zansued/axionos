import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PipelineState {
  /** initiative_id → stage currently running */
  running: Record<string, string>;
}

/** Completed pipeline events for badge notifications */
export interface PipelineEvent {
  id: string;
  initiativeId: string;
  stage: string;
  label: string;
  timestamp: number;
  read: boolean;
}

interface PipelineContextValue {
  running: Record<string, string>;
  events: PipelineEvent[];
  unreadCount: number;
  isRunning: (initiativeId: string) => boolean;
  getRunningStage: (initiativeId: string) => string | null;
  runStage: (
    initiativeId: string,
    stage: string,
    comment?: string,
    publishParams?: { github_token: string; owner: string; repo: string; base_branch: string }
  ) => void;
  rollbackToStage: (initiativeId: string, macroKey: string) => Promise<void>;
  markAllRead: () => void;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<PipelineEvent[]>([]);

  const addEvent = useCallback((initiativeId: string, stage: string, label: string) => {
    setEvents((prev) => [
      { id: crypto.randomUUID(), initiativeId, stage, label, timestamp: Date.now(), read: false },
      ...prev.slice(0, 49), // keep last 50
    ]);
  }, []);

  const markAllRead = useCallback(() => {
    setEvents((prev) => prev.map((e) => ({ ...e, read: true })));
  }, []);

  const unreadCount = events.filter((e) => !e.read).length;

  // Map stage names to dedicated edge function names
  const getStageFunctionName = (stage: string): string => {
    const functionMap: Record<string, string> = {
      comprehension: "pipeline-comprehension",
      architecture: "pipeline-architecture",
      discovery: "pipeline-discovery",
      squad_formation: "pipeline-squad",
      planning: "pipeline-planning",
      approve: "pipeline-approve",
      reject: "pipeline-reject",
      execution: "pipeline-execution-orchestrator",
      validation: "pipeline-validation",
      deep_validation: "pipeline-deep-validation",
      publish: "pipeline-publish",
      fast_modify: "pipeline-fast-modify",
      full_review: "pipeline-full-review",
      brain_sync: "brain-sync",
      drift_detection: "pipeline-drift-detection",
      runtime_validation: "pipeline-runtime-validation",
    };
    return functionMap[stage] || "run-initiative-pipeline";
  };

  const runStage = useCallback(
    async (
      initiativeId: string,
      stage: string,
      comment?: string,
      publishParams?: { github_token: string; owner: string; repo: string; base_branch: string }
    ) => {
      setRunning((prev) => ({ ...prev, [initiativeId]: stage }));
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) throw new Error("Não autenticado");
        const payload = {
          initiativeId,
          stage,
          ...(comment ? { comment } : {}),
          ...(publishParams || {}),
        };

        const functionName = getStageFunctionName(stage);
        const { data: result, error } = await supabase.functions.invoke(functionName, {
          body: payload,
        });

        if (error) {
          let message = error.message || "Erro ao executar pipeline";
          // Detect timeout / network errors
          if (message.includes("Failed to send a request") || message.includes("FunctionsFetchError")) {
            message = "A função excedeu o tempo limite ou falhou na conexão. Tente novamente — a validação agora processa em lotes menores.";
          }
          const context = (error as any)?.context;
          if (context && typeof context.json === "function") {
            const errJson = await context.json().catch(() => null);
            if (errJson?.error) message = errJson.error;
          }
          throw new Error(message);
        }
        const stageLabels: Record<string, string> = {
          comprehension: `Compreensão concluída: 4 agentes (Vision, Market, Requirements, Product Architect) ✅`,
          architecture: `Arquitetura técnica concluída: 4 agentes (System, Data, API Architect, Dependency Planner) ✅`,
          discovery: "Descoberta inteligente concluída ✅",
          squad_formation: `Squad formado com ${result.agents?.length || 0} agentes ✅`,
          planning: `Planejamento concluído: 3 agentes, ${result.stories?.length || result.stories_created || 0} stories, ${result.total_subtasks || 0} subtasks ✅`,
          approve: "Stage aprovado ✅",
          reject: "Ajustes solicitados — pipeline retornou ao estágio anterior ⟲",
          execution: `Implementação concluída: ${result.code_files || 0} arquivos (Code Architect → Developer → Integration) ✅`,
          validation: result.batch_incomplete
            ? `Fix Loop: ${result.processed_in_batch || 0} processados, ${result.fixed || 0} corrigidos, ${result.remaining_to_validate || 0} restantes ⏳`
            : result.overall_pass
              ? `Verificação aprovada: ${result.passed || 0}/${result.artifacts_validated || 0} artefatos${result.fixed ? `, ${result.fixed} corrigidos pelo Fix Agent (max 3x)` : ""} ✅`
              : `Fix Loop: ${result.failed || 0} falhas, ${result.fixed || 0} corrigidos, ${result.pending_review || 0} escalados para humano de ${result.artifacts_validated || 0} artefatos ⚠️`,
          deep_validation: result.passed
            ? `Deep Static Analysis: ${result.total_files || 0} arquivos verificados, ${result.warnings_count || 0} warnings ✅`
            : `Deep Static Analysis: ${result.errors_count || 0} erros, ${result.warnings_count || 0} warnings em ${result.total_files || 0} arquivos ❌`,
          drift_detection: result.passed
            ? `Drift Detection: ${result.files_analyzed || 0} arquivos, drift score ${result.drift_score || 0}% ✅`
            : `Drift Detection: ${result.errors_count || 0} violações, drift score ${result.drift_score || 0}% ⚠️`,
          runtime_validation: `Runtime Validation: ${result.files_pushed || 0} arquivos enviados para CI (tsc + vite build). Resultados via webhook ⏳`,
          publish: `Release Agent: ${result.files_committed || 0} arquivos publicados v${result.version || "1.0.0"} (Pre-flight → Changelog → Push → Verificação) ✅`,
        };
        const label = stageLabels[stage] || "Concluído!";
        toast({ title: label });

        // Add event for completed stages (not intermediate batch steps)
        const isFinalStep = stage !== "validation" || !result.batch_incomplete;
        if (isFinalStep && !["approve", "reject"].includes(stage)) {
          addEvent(initiativeId, stage, label);
        }

        queryClient.invalidateQueries({ queryKey: ["initiatives"] });
        queryClient.invalidateQueries({ queryKey: ["initiative-jobs"] });
        queryClient.invalidateQueries({ queryKey: ["squads"] });

        // Auto-trigger validation after execution
        if (stage === "execution" && result.success) {
          toast({ title: "🔍 Iniciando validação automática dos artefatos..." });
          setTimeout(() => {
            runStage(initiativeId, "validation");
          }, 1500);
          return; // Don't clear running yet
        }

        // Continue validation automatically while there are remaining batched artifacts
        if (stage === "validation" && result.success && result.batch_incomplete) {
          toast({ title: `🔁 Continuando validação automática (${result.remaining_to_validate || 0} restantes)...` });
          setTimeout(() => {
            runStage(initiativeId, "validation");
          }, 1200);
          return;
        }

        // Auto-trigger deep validation after AI validation passes
        if (stage === "validation" && result.success && result.overall_pass) {
          toast({ title: "🔬 Iniciando Deep Static Analysis (imports, tipos, build)..." });
          setTimeout(() => {
            runStage(initiativeId, "deep_validation");
          }, 1500);
          return;
        }

        // Auto-trigger drift detection after deep validation passes
        if (stage === "deep_validation" && result.success && result.passed) {
          toast({ title: "🏗️ Iniciando Architectural Drift Detection..." });
          setTimeout(() => {
            runStage(initiativeId, "drift_detection");
          }, 1500);
          return;
        }

        // Auto-trigger runtime validation after drift detection passes
        if (stage === "drift_detection" && result.success && result.passed) {
          toast({ title: "🚀 Iniciando Runtime Validation (tsc + vite build via CI)..." });
          setTimeout(() => {
            runStage(initiativeId, "runtime_validation");
          }, 1500);
          return;
        }
      } catch (e: any) {
        toast({ variant: "destructive", title: "Erro", description: e.message });
        addEvent(initiativeId, stage, `❌ Erro em ${stage}: ${e.message?.slice(0, 80)}`);
      } finally {
        setRunning((prev) => {
          const next = { ...prev };
          // Only clear if it's still the same stage (not replaced by auto-validation)
          if (next[initiativeId] === stage) {
            delete next[initiativeId];
          }
          return next;
        });
      }
    },
    [toast, queryClient, addEvent]
  );

  const rollbackToStage = useCallback(
    async (initiativeId: string, macroKey: string) => {
    const rollbackMap: Record<string, string> = {
      discovery: "draft",
      architecture: "architecture_ready",
      squad: "squad_ready",
      planning: "planning_ready",
      execution: "planned",
      validation: "in_progress",
      publish: "ready_to_publish",
    };
      const targetStatus = rollbackMap[macroKey];
      if (!targetStatus) return;
      try {
        const { error } = await supabase
          .from("initiatives")
          .update({ stage_status: targetStatus } as any)
          .eq("id", initiativeId);
        if (error) throw error;
        toast({ title: `Pipeline retornado para refazer "${macroKey}" ⟲` });
        queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      } catch (e: any) {
        toast({ variant: "destructive", title: "Erro no rollback", description: e.message });
      }
    },
    [toast, queryClient]
  );

  return (
    <PipelineContext.Provider
      value={{
        running,
        events,
        unreadCount,
        isRunning: (id) => !!running[id],
        getRunningStage: (id) => running[id] || null,
        runStage,
        rollbackToStage,
        markAllRead,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

const NOOP_PIPELINE: PipelineContextValue = {
  running: {},
  events: [],
  unreadCount: 0,
  isRunning: () => false,
  getRunningStage: () => null,
  runStage: () => {},
  rollbackToStage: async () => {},
  markAllRead: () => {},
};

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  return ctx || NOOP_PIPELINE;
}
