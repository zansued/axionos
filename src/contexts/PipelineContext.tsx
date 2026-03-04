import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PipelineState {
  /** initiative_id → stage currently running */
  running: Record<string, string>;
}

interface PipelineContextValue {
  running: Record<string, string>;
  isRunning: (initiativeId: string) => boolean;
  getRunningStage: (initiativeId: string) => string | null;
  runStage: (
    initiativeId: string,
    stage: string,
    comment?: string,
    publishParams?: { github_token: string; owner: string; repo: string; base_branch: string }
  ) => void;
  rollbackToStage: (initiativeId: string, macroKey: string) => Promise<void>;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState<Record<string, string>>({});

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

        const { data: result, error } = await supabase.functions.invoke("run-initiative-pipeline", {
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
          discovery: "Descoberta inteligente concluída ✅",
          squad_formation: `Squad formado com ${result.agents?.length || 0} agentes ✅`,
          planning: `Planning completo: ${result.stories?.length || 0} stories criadas ✅`,
          approve: "Stage aprovado ✅",
          reject: "Ajustes solicitados — pipeline retornou ao estágio anterior ⟲",
          execution: `Execução concluída: ${result.code_files || 0} arquivos de código, ${result.executed || 0} subtasks ✅`,
          validation: result.batch_incomplete
            ? `Validação em lote: ${result.processed_in_batch || 0} processados, ${result.remaining_to_validate || 0} restantes ⏳`
            : result.overall_pass
              ? `Validação aprovada: ${result.passed || 0}/${result.artifacts_validated || 0} artefatos ✅`
              : `Validação: ${result.failed || 0} falhas de ${result.artifacts_validated || 0} artefatos ⚠️`,
          publish: `Publicação concluída: ${result.files_committed || 0} arquivos commitados no main ✅`,
        };
        toast({ title: stageLabels[stage] || "Concluído!" });
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
      } catch (e: any) {
        toast({ variant: "destructive", title: "Erro", description: e.message });
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
    [toast, queryClient]
  );

  const rollbackToStage = useCallback(
    async (initiativeId: string, macroKey: string) => {
      const rollbackMap: Record<string, string> = {
        discovery: "draft",
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
        isRunning: (id) => !!running[id],
        getRunningStage: (id) => running[id] || null,
        runStage,
        rollbackToStage,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
  return ctx;
}
