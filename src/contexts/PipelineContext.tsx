import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
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

  // Track which initiatives already had their CI completion handled
  const handledCIRef = useRef<Set<string>>(new Set());

  // ── Realtime: listen for initiative stage_status changes from webhook ──
  useEffect(() => {
    const channel = supabase
      .channel("pipeline-initiative-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "initiatives" },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          const initiativeId = newRow.id;

          // CI webhook updated stage_status to ready_to_publish
          if (
            newRow.stage_status === "ready_to_publish" &&
            oldRow?.stage_status !== "ready_to_publish" &&
            !handledCIRef.current.has(initiativeId)
          ) {
            handledCIRef.current.add(initiativeId);
            const label = "✅ CI passou! Runtime Validation concluída — pronto para publicar";
            toast({ title: label });
            addEvent(initiativeId, "runtime_validation", label);

            // Clear running state if still waiting on runtime_validation
            setRunning((prev) => {
              const next = { ...prev };
              if (next[initiativeId] === "runtime_validation") {
                delete next[initiativeId];
              }
              return next;
            });

            // Invalidate queries so UI refreshes
            queryClient.invalidateQueries({ queryKey: ["initiatives"] });
            queryClient.invalidateQueries({ queryKey: ["initiative-jobs"] });
          }

          // CI webhook reported failure — trigger fix swarm notification
          if (
            newRow.stage_status === "validating" &&
            oldRow?.stage_status !== "validating"
          ) {
            const progress = newRow.execution_progress;
            if (progress?.ci_status === "failed") {
              const label = `❌ CI falhou — Fix Swarm acionado automaticamente`;
              toast({ variant: "destructive", title: label });
              addEvent(initiativeId, "runtime_validation", label);

              setRunning((prev) => {
                const next = { ...prev };
                if (next[initiativeId] === "runtime_validation") {
                  delete next[initiativeId];
                }
                return next;
              });

              queryClient.invalidateQueries({ queryKey: ["initiatives"] });
            }
          }

          // ── Repo lifecycle alerts ──
          const progress = newRow.execution_progress;
          const oldProgress = oldRow?.execution_progress;
          if (progress?.repo_alert && progress.repo_alert !== oldProgress?.repo_alert) {
            const repoStatus = progress.repo_status;
            const isDestructive = ["deleted", "branch_deleted", "failed"].includes(repoStatus);
            const icon = repoStatus === "deleted" ? "🗑️" :
              repoStatus === "branch_deleted" ? "⚠️" :
              repoStatus === "archived" ? "📦" :
              repoStatus === "privatized" ? "🔒" :
              progress.deploy_status === "failed" ? "❌" :
              progress.deploy_status === "success" ? "✅" : "ℹ️";

            const label = `${icon} ${progress.repo_alert}`;
            toast({ variant: isDestructive ? "destructive" : "default", title: label });
            addEvent(initiativeId, "repo_lifecycle", label);
            queryClient.invalidateQueries({ queryKey: ["initiatives"] });
          }

          // Deploy success notification
          if (progress?.deploy_status === "success" && oldProgress?.deploy_status !== "success") {
            const url = progress.deploy_url || "";
            const label = `✅ Deploy concluído${url ? `: ${url}` : ""}`;
            toast({ title: label });
            addEvent(initiativeId, "deploy", label);
            queryClient.invalidateQueries({ queryKey: ["initiatives"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, addEvent, queryClient]);

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
      preventive_validation: "pipeline-preventive-validation",
      architecture_simulation: "pipeline-architecture-simulation",
      bootstrap_intelligence: "project-bootstrap-intelligence",
      foundation_scaffold: "pipeline-foundation-scaffold",
      module_graph_simulation: "pipeline-module-graph-simulation",
      dependency_intelligence: "pipeline-dependency-intelligence",
      ecosystem_drift: "ecosystem-drift-intelligence",
      supabase_schema_bootstrap: "supabase-schema-bootstrap",
      supabase_provisioning: "supabase-provisioning-engine",
      error_intelligence: "error-intelligence",
      build_repair: "autonomous-build-repair",
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
          architecture_simulation: `Simulação de arquitetura concluída: score ${result.score || 0}/100, ${result.repairs?.length || 0} reparos ${result.passed ? "✅" : "⚠️"}`,
          bootstrap_intelligence: `Bootstrap Intelligence: ${result.stack || "react-vite"} stack, ${result.files_injected || 0} arquivos injetados, build confidence ${((result.build_confidence || 0) * 100).toFixed(0)}% ${result.build_prediction ? "✅" : "⚠️"}`,
          foundation_scaffold: `Foundation Scaffold: ${result.files_generated || 0} arquivos (${result.stack || "react-vite"}). Build confidence: ${((result.build_confidence || 0) * 100).toFixed(0)}% ${result.validation_passed ? "✅" : "⚠️"}`,
          module_graph_simulation: `Module Graph: ${result.total_files || 0} arquivos, ${result.total_imports || 0} imports, ${result.broken_imports || 0} broken, score ${result.graph_health_score || 0} ${result.passed ? "✅" : "⚠️"}`,
          dependency_intelligence: `Dep Intelligence: ${result.total_dependencies || 0} deps, ${result.missing_dependencies || 0} missing, ${result.deprecated_libraries || 0} deprecated, score ${result.dependency_health_score || 0} ${result.passed ? "✅" : "⚠️"}`,
          ecosystem_drift: `Ecosystem Drift: ${result.packages_checked || 0} deps, ${result.drift_events || 0} events, score ${result.ecosystem_health_score || 0} ${result.ecosystem_health_score >= 0.75 ? "✅" : "⚠️"}`,
          supabase_schema_bootstrap: result.skipped
            ? `Schema Bootstrap: pulado (sem conexão Supabase)`
            : `Schema Bootstrap: ${result.schema_name || "?"} criado (${result.creation_method || "?"}) ${result.schema_validated ? "✅" : "⚠️"}`,
          supabase_provisioning: result.skipped
            ? `DB Provisioning: pulado (sem schema)`
            : `DB Provisioning: ${result.tables_created?.length || 0} tabelas, RLS ${result.rls_enabled ? "✅" : "⚠️"}, bucket ${result.bucket_created ? "✅" : "⚠️"}`,
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
          build_repair: result.success
            ? `Build Repair: attempt ${result.attempt || 1}, ${result.patches_applied || 0} patches, commit ${(result.commit_sha || "").slice(0, 7)} ✅`
            : `Build Repair: attempt ${result.attempt || 1} falhou — ${result.message || "erro"} ❌`,
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
      bootstrap: "architecture_validated",
      scaffold: "bootstrapped",
      module_graph: "scaffolded",
      dependency_intelligence: "modules_simulated",
      schema_bootstrap: "dependencies_analyzed",
      squad: "schema_bootstrapped",
      planning: "planning_ready",
      execution: "planned",
      validation: "in_progress",
      build_repair: "validating",
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
