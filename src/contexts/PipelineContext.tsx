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
  const retryCountRef = useRef<Record<string, number>>({});

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
      // v3 Venture Intelligence Layer
      opportunity_discovery: "opportunity-discovery-engine",
      market_signal_analysis: "market-signal-analyzer",
      product_validation: "product-validation-engine",
      revenue_strategy: "revenue-strategy-engine",
      // v2 Core Pipeline
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
      domain_model_analysis: "ai-domain-model-analyzer",
      data_model_generation: "supabase-data-model-generator",
      business_logic_synthesis: "ai-business-logic-synthesizer",
      api_generation: "autonomous-api-generator",
      ui_generation: "autonomous-ui-generator",
      adaptive_learning: "adaptive-learning-engine",
      error_intelligence: "error-intelligence",
      build_repair: "autonomous-build-repair",
      deploy_vercel: "initiative-deploy-engine",
      // Background Intelligence (runs autonomously after Runtime)
      observability: "observability-engine",
      product_analytics: "product-analytics-engine",
      user_behavior_analysis: "user-behavior-analyzer",
      growth_optimization: "growth-optimization-engine",
      product_evolution: "product-evolution-engine",
      architecture_evolution: "architecture-evolution-engine",
      portfolio_management: "startup-portfolio-manager",
      system_evolution: "system-evolution-engine",
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
      // Guard: prevent concurrent stages on the same initiative
      if (running[initiativeId] && running[initiativeId] !== stage) {
        console.warn(
          `[PipelineContext] Blocked duplicate stage "${stage}" — "${running[initiativeId]}" already running for ${initiativeId}`
        );
        toast({
          title: `⚠️ Estágio "${running[initiativeId]}" ainda em execução. Aguarde antes de iniciar "${stage}".`,
        });
        return;
      }
      // Pre-flight: check stories exist before execution
      if (stage === "execution") {
        const { count } = await supabase
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("initiative_id", initiativeId);
        if (!count || count === 0) {
          toast({
            variant: "destructive",
            title: "⚠️ Nenhuma story encontrada",
            description: "Execute o Planning primeiro para gerar as stories antes da execução.",
          });
          return;
        }
      }

      setRunning((prev) => ({ ...prev, [initiativeId]: stage }));
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) throw new Error("Não autenticado");

        // Auto-cleanup stale running jobs (>2min) before starting new pipeline
        const staleThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        await supabase
          .from("initiative_jobs")
          .update({
            status: "failed" as any,
            error: "Auto-cleanup: exceeded max runtime (2min)",
            completed_at: new Date().toISOString(),
          })
          .eq("status", "running")
          .lt("created_at", staleThreshold);

        const payload = {
          initiativeId,
          stage,
          ...(comment ? { comment } : {}),
          ...(publishParams || {}),
        };

        const functionName = getStageFunctionName(stage);

        // Auto-retry with exponential backoff for timeout/network errors
        const MAX_RETRIES = 2;
        let rawResult: any = null;
        let lastError: any = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            const delay = Math.min(3000 * attempt, 8000);
            toast({ title: `🔄 Tentativa ${attempt + 1}/${MAX_RETRIES + 1} — reconectando em ${delay / 1000}s...` });
            await new Promise((r) => setTimeout(r, delay));
          }

          const { data, error } = await supabase.functions.invoke(functionName, {
            body: { ...payload, ...(attempt > 0 ? { retry_attempt: attempt } : {}) },
          });

          if (!error) {
            rawResult = data;
            lastError = null;
            break;
          }

          const msg = error.message || "";
          const isTimeout = msg.includes("Failed to send a request") ||
            msg.includes("FunctionsFetchError") ||
            msg.includes("AbortError") ||
            msg.includes("network") ||
            msg.includes("timeout");

          if (isTimeout && attempt < MAX_RETRIES) {
            lastError = error;
            continue; // retry
          }

          // Non-retryable or last attempt
          let message = msg || "Erro ao executar pipeline";
          const context = (error as any)?.context;
          if (context && typeof context.json === "function") {
            const errJson = await context.json().catch(() => null);
            if (errJson?.error) message = errJson.error;
          }
          throw new Error(message);
        }

        if (lastError && !rawResult) {
          throw new Error("Conexão falhou após múltiplas tentativas. Verifique sua rede e tente novamente.");
        }

        // Handle background-processed stages: poll job until completion
        let result = rawResult;
        if (result?.status === "processing" && result?.job_id) {
          toast({ title: `⏳ ${stage} em processamento em background...` });
          const jobId = result.job_id;
          const maxPolls = 120; // up to ~4 minutes
          for (let i = 0; i < maxPolls; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            const { data: job } = await supabase
              .from("initiative_jobs")
              .select("status, outputs, error")
              .eq("id", jobId)
              .single();
            if (!job) continue;
            if (job.status === "success") {
              result = { success: true, ...(typeof job.outputs === "object" && job.outputs ? job.outputs : {}) };
              break;
            }
            if (job.status === "failed") {
              throw new Error(typeof job.error === "string" ? job.error : "Background job failed");
            }
            // Still running, continue polling
          }
          // If still processing after max polls, treat as timeout
          if (result?.status === "processing") {
            throw new Error("Background job timed out. Check pipeline status.");
          }
        }
        const stageLabels: Record<string, string> = {
          // v3 Venture Intelligence Layer
          opportunity_discovery: `Opportunity Discovery: ${result.opportunities_found || 0} oportunidades, viability score ${result.viability_score || 0}/100 ✅`,
          market_signal_analysis: `Market Signals: demand ${result.demand_level || "?"}, competition ${result.competition_level || "?"}, viability ${result.viability_index || 0}/100 ✅`,
          product_validation: `Product Validation: score ${result.validation_score || 0}/100, adoption ${result.estimated_adoption || "?"}, risk ${result.risk_level || "?"} ✅`,
          revenue_strategy: `Revenue Strategy: ${result.pricing_model || "SaaS"}, ${result.tiers_count || 0} tiers definidos ✅`,
          // v2 Core Pipeline
          comprehension: `Compreensão concluída: 4 agentes (Vision, Market, Requirements, Product Architect) ✅`,
          architecture: `Arquitetura técnica concluída: 4 agentes (System, Data, API Architect, Dependency Planner) ✅`,
          architecture_simulation: `Simulação de arquitetura concluída: score ${result.score || 0}/100, ${result.repairs?.length || 0} reparos ${result.passed ? "✅" : "⚠️"}`,
          preventive_validation: `Validação Preventiva: ${result.issues?.length || 0} issues, ${result.fixes_applied || 0} corrigidos, ${result.prevention_rules_active || 0} regras ativas ✅`,
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
          domain_model_analysis: `Domain Analysis: ${result.entities_detected || 0} entidades, ${result.relationships_detected || 0} relacionamentos, ${result.attributes_detected || 0} atributos ✅`,
          business_logic_synthesis: `Business Logic: ${result.services_generated || 0} serviços, ${result.total_actions || 0} ações, ${result.validation_rules || 0} validações, ${result.workflows_count || 0} workflows ✅`,
          data_model_generation: `Data Model: ${result.tables_generated || 0} tabelas, ${result.total_columns || 0} colunas, ${result.rls_policies || 0} RLS policies, ${result.indexes_created || 0} indexes ✅`,
          api_generation: `API Generator: ${result.entities_exposed || 0} entidades, ${result.endpoints_created || 0} endpoints, ${result.rpc_functions || 0} RPCs, ${result.webhooks_created || 0} webhooks ✅`,
          ui_generation: `UI Generator: ${result.pages_generated || 0} páginas, ${result.components_generated || 0} componentes, ${result.hooks_generated || 0} hooks ✅`,
          adaptive_learning: `Learning Engine: ${result.errors_analyzed || 0} erros analisados, ${result.rules_created || 0} regras criadas, ${result.rules_updated || 0} atualizadas, ${result.architectural_patterns || 0} padrões ✅`,
          discovery: "Descoberta inteligente concluída ✅",
          squad_formation: `Squad formado com ${result.agents?.length || 0} agentes ✅`,
          planning: `Planejamento concluído: 3 agentes, ${result.stories?.length || result.stories_created || 0} stories, ${result.total_subtasks || 0} subtasks ✅`,
          approve: result.new_status === "completed"
            ? "🏁 Iniciativa concluída com sucesso!"
            : result.new_status
              ? `Stage avançou: ${result.previous_status || "?"} → ${result.new_status} ✅`
              : "Stage aprovado ✅",
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
          // Background Intelligence (autonomous)
          observability: `System Intelligence: ${result.metrics_collected || 0} métricas coletadas ✅`,
          product_analytics: `System Intelligence: ${result.users_tracked || 0} usuários, ${result.events_analyzed || 0} eventos ✅`,
          user_behavior_analysis: `System Intelligence: ${result.patterns_detected || 0} padrões detectados ✅`,
          growth_optimization: `System Intelligence: ${result.optimizations_suggested || 0} otimizações sugeridas ✅`,
          product_evolution: `Product Evolution: ${result.features_added || 0} features, ${result.modules_removed || 0} removidos ✅`,
          architecture_evolution: `Architecture Evolution: ${result.patterns_learned || 0} padrões aprendidos ✅`,
          portfolio_management: `Portfolio: ${result.products_managed || 0} produtos gerenciados ✅`,
          system_evolution: `System Evolution: ${result.improvements_applied || 0} melhorias aplicadas ✅`,
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

        // Auto-continue execution when batch is incomplete (time budget pause)
        if (stage === "execution" && result.success && result.batch_incomplete) {
          toast({ title: `⏳ Execução em lotes: ${result.executed || 0} prontos, ${result.remaining_to_execute || 0} restantes. Continuando automaticamente...` });
          setTimeout(() => {
            runStage(initiativeId, "execution");
          }, 2000);
          return;
        }

        // Auto-trigger validation after execution completes fully
        if (stage === "execution" && result.success && !result.batch_incomplete) {
          const producedOrReused = (result.code_files || 0) + (result.skipped || 0);
          if (producedOrReused <= 0) {
            toast({
              variant: "destructive",
              title: "⚠️ Execução concluída sem arquivos pendentes para processar. Rode Planning/Execution novamente para gerar artefatos.",
            });
            addEvent(initiativeId, stage, "Execução sem artefatos processáveis — validação automática não iniciada");
          } else {
            retryCountRef.current[initiativeId] = 0; // reset on success
            toast({ title: "🔍 Iniciando validação automática dos artefatos..." });
            setTimeout(() => {
              runStage(initiativeId, "validation");
            }, 1500);
            return; // Don't clear running yet
          }
        }

        // Continue validation automatically while there are remaining batched artifacts
        if (stage === "validation" && result.success && result.batch_incomplete) {
          toast({ title: `🔁 Continuando validação automática (${result.remaining_to_validate || 0} restantes)...` });
          setTimeout(() => {
            runStage(initiativeId, "validation");
          }, 1200);
          return;
        }

        // Auto-trigger deep validation after AI validation completes (pass or fail — always continue chain)
        // But skip if there were literally no artifacts to validate (execution didn't produce anything)
        if (stage === "validation" && result.success && !result.batch_incomplete) {
          const hasArtifacts = (result.artifacts_validated || 0) > 0;
          if (!hasArtifacts) {
            toast({ variant: "destructive", title: "⚠️ Nenhum artefato encontrado para validar. Execute o pipeline de execução primeiro." });
            addEvent(initiativeId, stage, "Fix Loop: nenhum artefato — execução pode não ter gerado código");
            // Don't continue chain — nothing to validate
          } else {
            if (result.overall_pass) {
              toast({ title: "✅ Fix Loop concluído! Iniciando Deep Static Analysis..." });
            } else {
              toast({ title: `⚠️ Fix Loop: ${result.failed || 0} falhas, ${result.fixed || 0} corrigidos. Continuando com Deep Static Analysis...` });
            }
            addEvent(initiativeId, stage, `Fix Loop finalizado: ${result.passed || 0} aprovados, ${result.failed || 0} falhas, ${result.fixed || 0} corrigidos`);
            setTimeout(() => {
              runStage(initiativeId, "deep_validation");
            }, 1500);
            return;
          }
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

        // Auto-trigger preventive validation after architecture simulation
        if (stage === "architecture_simulation" && result.success) {
          toast({ title: "🛡️ Iniciando Validação Preventiva da Arquitetura..." });
          setTimeout(() => {
            runStage(initiativeId, "preventive_validation");
          }, 1500);
          return;
        }

        // Auto-trigger bootstrap intelligence after preventive validation
        if (stage === "preventive_validation" && result.success) {
          toast({ title: "🧠 Iniciando Bootstrap Intelligence..." });
          setTimeout(() => {
            runStage(initiativeId, "bootstrap_intelligence");
          }, 1500);
          return;
        }

        // Auto-continuation after approve: chain into the next runnable stage
        if (stage === "approve" && result.success && result.new_status) {
          const autoContinueMap: Record<string, { fn: string; label: string }> = {
            bootstrapping_schema: { fn: "supabase_schema_bootstrap", label: "🗄️ Schema Bootstrap" },
            provisioning_db: { fn: "supabase_provisioning", label: "🗄️ DB Provisioning" },
            analyzing_domain: { fn: "domain_model_analysis", label: "🧠 Domain Analysis" },
            generating_data_model: { fn: "data_model_generation", label: "🗄️ Data Model Generation" },
            synthesizing_logic: { fn: "business_logic_synthesis", label: "⚙️ Business Logic Synthesis" },
            generating_api: { fn: "api_generation", label: "🔌 API Generation" },
            generating_ui: { fn: "ui_generation", label: "🖥️ UI Generation" },
            simulating_modules: { fn: "module_graph_simulation", label: "🔗 Module Graph Simulation" },
            analyzing_dependencies: { fn: "dependency_intelligence", label: "📦 Dependency Intelligence" },
            architecture_ready: { fn: "architecture", label: "🏗️ Arquitetura" },
            squad_ready: { fn: "squad_formation", label: "👥 Squad Formation" },
            planning_ready: { fn: "planning", label: "📋 Planning" },
            in_progress: { fn: "execution", label: "⚡ Execução" },
            // Post-deploy / runtime chain
            observability_ready: { fn: "observability", label: "📡 System Observability" },
            analytics_ready: { fn: "product_analytics", label: "📊 Product Analytics" },
            behavior_analyzed: { fn: "user_behavior_analysis", label: "🧠 User Behavior Analysis" },
            growth_optimized: { fn: "growth_optimization", label: "🚀 Growth Optimization" },
            product_evolved: { fn: "product_evolution", label: "🔄 Product Evolution" },
            architecture_evolved: { fn: "architecture_evolution", label: "🏗️ Architecture Evolution" },
          };
          const next = autoContinueMap[result.new_status];
          if (next) {
            toast({ title: `${next.label} — iniciando automaticamente...` });
            setTimeout(() => {
              runStage(initiativeId, next.fn);
            }, 1500);
            return;
          }
        }
      } catch (e: any) {
        const isTimeout = e.message?.includes("tempo limite") || e.message?.includes("Failed to send") || e.message?.includes("FunctionsFetchError") || e.message?.includes("AbortError");
        
        // Auto-retry execution on timeout — the orchestrator saves progress so retrying continues from where it stopped
        if (stage === "execution" && isTimeout) {
          const retryCount = (retryCountRef.current[initiativeId] || 0) + 1;
          retryCountRef.current[initiativeId] = retryCount;
          if (retryCount > 5) {
            retryCountRef.current[initiativeId] = 0;
            toast({ variant: "destructive", title: "❌ Limite de retries atingido (5×). Verifique a Edge Function de execução." });
            addEvent(initiativeId, stage, `❌ Auto-retry abortado após 5 tentativas`);
            return;
          }
          toast({ title: `⏳ Timeout (tentativa ${retryCount}/5). Continuando execução automaticamente...` });
          addEvent(initiativeId, stage, `⏳ Timeout — auto-retry ${retryCount}/5`);
          setTimeout(() => {
            runStage(initiativeId, "execution");
          }, 3000);
          return; // Don't clear running state
        }

        // Auto-retry validation on timeout — approved artifacts are persisted, so retrying continues with remaining
        if (stage === "validation" && isTimeout) {
          toast({ title: "⏳ Validação: timeout. Continuando automaticamente com próximo lote..." });
          addEvent(initiativeId, stage, `⏳ Timeout — auto-retrying validação em lotes`);
          setTimeout(() => {
            runStage(initiativeId, "validation");
          }, 3000);
          return; // Don't clear running state
        }

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
      // v3 Venture Intelligence
      opportunity_discovery: "draft",
      market_signals: "opportunity_discovered",
      product_validation: "market_signals_analyzed",
      revenue_strategy: "product_validated",
      // v2 Core Pipeline
      discovery: "revenue_strategized",
      architecture: "discovered",
      simulation: "architected",
      preventive_validation: "architecture_simulated",
      bootstrap: "architecture_validated",
      scaffold: "bootstrapped",
      module_graph: "scaffolded",
      dependency_intelligence: "modules_simulated",
      schema_bootstrap: "dependencies_analyzed",
      db_provisioning: "schema_bootstrapped",
      domain_analysis: "db_provisioned",
      data_model_generation: "domain_analyzed",
      business_logic: "data_model_generated",
      api_generation: "logic_synthesized",
      ui_generation: "api_generated",
      squad: "ui_generated",
      planning: "planning_ready",
      execution: "planned",
      validation: "in_progress",
      build_repair: "validating",
      publish: "ready_to_publish",
      // Background Intelligence (autonomous — all map to Runtime in visible pipeline)
      observability: "published",
      product_analytics: "product_observed",
      user_behavior: "product_metrics_analyzed",
      growth_optimization: "user_behavior_analyzed",
      adaptive_learning: "growth_optimized",
      product_evolution: "system_learned",
      architecture_evolution: "product_evolved",
      portfolio_management: "architecture_evolved",
      system_evolution: "portfolio_managed",
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
