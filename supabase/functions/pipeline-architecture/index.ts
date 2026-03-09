// Layer 2 — Technical Architecture (Subjob Orchestrator)
// Orchestrates: System → [Data ∥ API] → Dependencies → Synthesis
// Each agent runs as an isolated subjob with independent persistence and timeout handling.
// v2: Background processing + per-attempt diagnostics + compact context

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, upsertNode, addEdge, recordDecision } from "../_shared/brain-helpers.ts";
import { ARCHITECTURE_SUBJOBS, getReadySubjobs, areAllComplete, hasAnyFailed } from "../_shared/architecture-subjob/types.ts";
import {
  createSubjobs, getSubjobs, markSubjobRunning, completeSubjob,
  failSubjob, blockDependents, cleanupStuckSubjobs,
} from "../_shared/architecture-subjob/subjob-manager.ts";
import {
  systemArchitectPrompt, dataArchitectPrompt,
  apiArchitectPrompt, dependencyPlannerPrompt,
} from "../_shared/architecture-subjob/prompts.ts";
import {
  createAttemptDiagnostic, appendDiagnostic, classifyFailure,
  compactSystemArchSummary, analyzeBottlenecks, estimateTokens,
} from "../_shared/architecture-subjob/diagnostics.ts";

interface AgentOutput {
  role: string;
  model: string;
  tokens: number;
  costUsd: number;
  durationMs: number;
  result: Record<string, unknown>;
}

async function runAgent(
  apiKey: string,
  role: string,
  systemPrompt: string,
  userPrompt: string,
  usePro = false,
): Promise<AgentOutput> {
  const aiResult = await callAI(apiKey, systemPrompt, userPrompt, true, 3, usePro);
  const result = JSON.parse(aiResult.content);
  return { role, model: aiResult.model, tokens: aiResult.tokens, costUsd: aiResult.costUsd, durationMs: aiResult.durationMs, result };
}

/** Execute a single subjob by key, using results from completed dependencies */
async function executeSubjob(
  subjobKey: string,
  apiKey: string,
  projectContext: string,
  requirementsData: string,
  productArchData: string,
  completedResults: Record<string, Record<string, unknown>>,
): Promise<AgentOutput> {
  const systemArchJson = JSON.stringify(completedResults["architecture.system"] || {}, null, 2);
  const dataArchJson = JSON.stringify(completedResults["architecture.data"] || {}, null, 2);
  const apiArchJson = JSON.stringify(completedResults["architecture.api"] || {}, null, 2);

  switch (subjobKey) {
    case "architecture.system": {
      const p = systemArchitectPrompt(projectContext, requirementsData, productArchData);
      return runAgent(apiKey, "system_architect", p.system, p.user, true);
    }
    case "architecture.data": {
      const p = dataArchitectPrompt(projectContext, requirementsData, systemArchJson);
      return runAgent(apiKey, "data_architect", p.system, p.user, true);
    }
    case "architecture.api": {
      const p = apiArchitectPrompt(projectContext, requirementsData, systemArchJson);
      return runAgent(apiKey, "api_architect", p.system, p.user, false);
    }
    case "architecture.dependencies": {
      const p = dependencyPlannerPrompt(projectContext, systemArchJson, dataArchJson, apiArchJson);
      return runAgent(apiKey, "dependency_planner", p.system, p.user, true);
    }
    case "architecture.synthesis": {
      // Synthesis: consolidate all results into architecture content
      const archContent = buildArchitectureContent(completedResults);
      return {
        role: "synthesis",
        model: "deterministic",
        tokens: 0,
        costUsd: 0,
        durationMs: 0,
        result: { architecture_content: archContent, synthesized: true },
      };
    }
    default:
      throw new Error(`Unknown subjob: ${subjobKey}`);
  }
}

function buildArchitectureContent(results: Record<string, Record<string, unknown>>): string {
  const sys = results["architecture.system"] || {};
  const data = results["architecture.data"] || {};
  const api = results["architecture.api"] || {};
  return [
    "# Arquitetura Técnica\n",
    `## Stack\n${JSON.stringify((sys as any).stack, null, 2)}\n`,
    `## Padrões\n${((sys as any).architecture_patterns as string[])?.join(", ") || ""}\n`,
    `## Banco de Dados\n${((data as any).tables as any[])?.map((t: any) => `- ${t.name}: ${t.description}`).join("\n") || ""}\n`,
    `## API\n${((api as any).endpoints as any[])?.map((e: any) => `- ${e.method} ${e.path}: ${e.description}`).join("\n") || ""}\n`,
  ].join("\n");
}

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-architecture");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey, body } = result;

  // Support retry mode: only re-execute specific subjobs
  const retrySubjobKey = body.retrySubjobKey as string | undefined;
  const existingJobId = body.existingJobId as string | undefined;

  const dp = initiative.discovery_payload || {};

  let jobId: string | null;
  if (existingJobId && retrySubjobKey) {
    jobId = existingJobId;
    await pipelineLog(ctx, "subjob_retry_start", `Retrying subjob: ${retrySubjobKey}`);
  } else {
    jobId = await createJob(ctx, "architecture", {
      title: initiative.title,
      complexity: initiative.complexity,
      suggested_stack: initiative.suggested_stack,
      orchestration: "subjob_v1_bg",
    });
    await updateInitiative(ctx, { stage_status: "architecting" });
    await pipelineLog(ctx, "pipeline_architecture_start", "Camada 2 — Arquitetura Técnica (background processing)");
  }

  if (!jobId) return errorResponse("Failed to create architecture job", 500);

  // Create subjobs eagerly so UI can show them immediately
  let subjobs = await getSubjobs(serviceClient, jobId);
  if (subjobs.length === 0) {
    subjobs = await createSubjobs(serviceClient, jobId, ctx.initiativeId, ctx.organizationId);
    await pipelineLog(ctx, "subjobs_created", `${subjobs.length} subjobs criados para arquitetura`);
  }

  // If retrying a specific subjob, reset it
  if (retrySubjobKey) {
    const { resetSubjobForRetry } = await import("../_shared/architecture-subjob/subjob-manager.ts");
    const targetSubjob = subjobs.find(s => s.subjob_key === retrySubjobKey);
    if (targetSubjob) {
      await resetSubjobForRetry(serviceClient, targetSubjob.id);
      const dependents = subjobs.filter(s =>
        s.depends_on.includes(retrySubjobKey) &&
        (s.status === "blocked" || s.status === "failed")
      );
      for (const dep of dependents) {
        await resetSubjobForRetry(serviceClient, dep.id);
      }
    }
  }

  // ──── Background processing via EdgeRuntime.waitUntil ────
  // Return immediately so we don't hold the parallel run slot
  const backgroundTask = processArchitectureInBackground(
    jobId, user, initiative, ctx, serviceClient, apiKey, dp, retrySubjobKey
  );

  // @ts-ignore — EdgeRuntime.waitUntil is available in Deno Deploy / Supabase Edge
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(backgroundTask);
  } else {
    // Fallback: run inline (dev/test environments)
    backgroundTask.catch(e => console.error("Background architecture error:", e));
  }

  return jsonResponse({
    success: true,
    message: "Architecture pipeline started in background",
    job_id: jobId,
    orchestration: "subjob_v1_bg",
  });
});

/** Full architecture orchestration — runs in background */
async function processArchitectureInBackground(
  jobId: string,
  user: { id: string; email?: string },
  initiative: Record<string, any>,
  ctx: any,
  serviceClient: any,
  apiKey: string,
  dp: Record<string, any>,
  retrySubjobKey?: string,
) {
  try {
    // Clean up any stuck running subjobs
    const cleaned = await cleanupStuckSubjobs(serviceClient, jobId, 120_000);
    if (cleaned > 0) {
      await pipelineLog(ctx, "subjobs_timeout_cleanup", `${cleaned} subjobs marcados como timeout`);
    }

    let subjobs = await getSubjobs(serviceClient, jobId);

    // Brain context
    const brainContext = await generateBrainContext(ctx);
    const brainBlock = brainContext ? `\n\n${brainContext}` : "";

    const projectContext = `Projeto: ${initiative.title}
Ideia refinada: ${initiative.refined_idea || initiative.description || ""}
Complexidade: ${initiative.complexity || "medium"}
Stack sugerida: ${initiative.suggested_stack || "React + Supabase"}
MVP: ${initiative.mvp_scope || "A definir"}
Público-alvo: ${initiative.target_user || "A definir"}${brainBlock}`;

    const requirementsData = dp.requirements ? JSON.stringify(dp.requirements, null, 2) : "Não disponível";
    const productArchData = dp.product_architecture ? JSON.stringify(dp.product_architecture, null, 2) : "Não disponível";

    // Collect completed results for dependency injection
    const completedResults: Record<string, Record<string, unknown>> = {};
    for (const s of subjobs) {
      if (s.status === "completed" && s.result) {
        completedResults[s.subjob_key] = s.result as Record<string, unknown>;
      }
    }

    // Execute subjobs in topological waves
    let maxWaves = 6;
    while (maxWaves-- > 0) {
      subjobs = await getSubjobs(serviceClient, jobId);

      for (const s of subjobs) {
        if (s.status === "completed" && s.result) {
          completedResults[s.subjob_key] = s.result as Record<string, unknown>;
        }
      }

      if (areAllComplete(subjobs)) break;

      const failed = hasAnyFailed(subjobs);
      if (failed.length > 0) {
        for (const f of failed) {
          await blockDependents(serviceClient, jobId, f.subjob_key);
        }
        const synthSubjob = subjobs.find(s => s.subjob_key === "architecture.synthesis");
        if (synthSubjob && (synthSubjob.status === "blocked" || synthSubjob.status === "failed" || synthSubjob.status === "failed_timeout")) {
          const failedKeys = failed.map(f => f.subjob_key).join(", ");
          await pipelineLog(ctx, "architecture_partial_failure", `Subjobs falharam: ${failedKeys}. Síntese bloqueada.`);
          await updateInitiative(ctx, { stage_status: "architecting" as any });
          await failJob(ctx, jobId, `Subjobs failed: ${failedKeys}`);
          return;
        }
      }

      const ready = getReadySubjobs(subjobs);
      if (ready.length === 0) break;

      const execPromises = ready.map(async (subjob) => {
        await markSubjobRunning(serviceClient, subjob.id);
        const def = ARCHITECTURE_SUBJOBS.find(d => d.key === subjob.subjob_key);
        const label = def?.label || subjob.subjob_key;
        await pipelineLog(ctx, `subjob_${subjob.subjob_key}_start`, `▶ ${label} iniciando...`);

        try {
          const timeoutMs = def?.timeoutMs || 45_000;
          const agentPromise = executeSubjob(
            subjob.subjob_key, apiKey, projectContext,
            requirementsData, productArchData, completedResults,
          );
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: ${subjob.subjob_key} exceeded ${timeoutMs}ms`)), timeoutMs)
          );
          const agentResult = await Promise.race([agentPromise, timeoutPromise]);

          await completeSubjob(serviceClient, subjob.id, agentResult.result, {
            model: agentResult.model, tokens: agentResult.tokens,
            costUsd: agentResult.costUsd, durationMs: agentResult.durationMs,
          });

          if (subjob.subjob_key !== "architecture.synthesis") {
            await serviceClient.from("agent_outputs").insert({
              organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
              type: "analysis", status: "approved",
              summary: `${label}: subjob completed`.slice(0, 200),
              raw_output: { agent: agentResult.role, layer: 2, subjob_key: subjob.subjob_key, ...agentResult.result },
              model_used: agentResult.model, tokens_used: agentResult.tokens, cost_estimate: agentResult.costUsd,
            });
          }

          completedResults[subjob.subjob_key] = agentResult.result;
          await pipelineLog(ctx, `subjob_${subjob.subjob_key}_complete`,
            `✓ ${label}: ${agentResult.tokens} tokens, $${agentResult.costUsd.toFixed(4)}, ${agentResult.durationMs}ms`
          );
          return { key: subjob.subjob_key, success: true };
        } catch (err: any) {
          const isTimeout = err.message?.includes("Timeout");
          if (isTimeout && subjob.attempt_number < (subjob.max_attempts || 3) - 1) {
            const { resetSubjobForRetry } = await import("../_shared/architecture-subjob/subjob-manager.ts");
            await failSubjob(serviceClient, subjob.id, err.message || "Timeout", true);
            await resetSubjobForRetry(serviceClient, subjob.id);
            await pipelineLog(ctx, `subjob_${subjob.subjob_key}_auto_retry`,
              `⟳ ${label} timeout — auto-retry (attempt ${subjob.attempt_number + 2})`, { is_timeout: true }
            );
            return { key: subjob.subjob_key, success: false, retrying: true };
          }
          await failSubjob(serviceClient, subjob.id, err.message || "Unknown error", isTimeout);
          await blockDependents(serviceClient, jobId, subjob.subjob_key);
          await pipelineLog(ctx, `subjob_${subjob.subjob_key}_failed`,
            `✗ ${label} falhou: ${err.message}`, { is_timeout: isTimeout }
          );
          return { key: subjob.subjob_key, success: false, error: err.message };
        }
      });

      await Promise.all(execPromises);
    }

    // Final check
    subjobs = await getSubjobs(serviceClient, jobId);
    if (!areAllComplete(subjobs)) {
      const failedList = hasAnyFailed(subjobs);
      const failedKeys = failedList.map(f => f.subjob_key).join(", ");
      await updateInitiative(ctx, { stage_status: "architecting" as any });
      await failJob(ctx, jobId, `Incomplete: failed subjobs: ${failedKeys || "deadlock"}`);
      return;
    }

    // ──── All subjobs complete — write brain + consolidate ────
    const systemResult = completedResults["architecture.system"] || {};
    const dataResult = completedResults["architecture.data"] || {};
    const apiResult = completedResults["architecture.api"] || {};
    const depResult = completedResults["architecture.dependencies"] || {};

    try {
      const tables = (dataResult.tables as any[]) || [];
      const tableNodeIds: Record<string, string> = {};
      for (const t of tables.slice(0, 30)) {
        const nodeId = await upsertNode(ctx, { node_type: "table", name: t.name, metadata: { columns: t.columns?.length, description: t.description, source: "architecture" }, status: "planned" });
        tableNodeIds[t.name] = nodeId;
      }
      const rels = (dataResult.relationships as any[]) || [];
      for (const rel of rels.slice(0, 50)) {
        const fromId = tableNodeIds[rel.from_table];
        const toId = tableNodeIds[rel.to_table];
        if (fromId && toId) await addEdge(ctx, { source_node_id: fromId, target_node_id: toId, relation_type: "stores_in_table", metadata: { type: rel.type, on_delete: rel.on_delete } });
      }
      const endpoints = (apiResult.endpoints as any[]) || [];
      for (const ep of endpoints.slice(0, 30)) {
        await upsertNode(ctx, { node_type: "api", name: `${ep.method} ${ep.path}`, metadata: { description: ep.description, auth_required: ep.auth_required, source: "architecture" }, status: "planned" });
      }
      const edgeFns = (apiResult.edge_functions as any[]) || [];
      for (const fn of edgeFns.slice(0, 20)) {
        await upsertNode(ctx, { node_type: "edge_function", name: fn.name, metadata: { description: fn.description, trigger: fn.trigger, source: "architecture" }, status: "planned" });
      }
      for (const pattern of ((systemResult.architecture_patterns as string[]) || []).slice(0, 5)) {
        await recordDecision(ctx, `Padrão: ${pattern}`, "Definido pelo System Architect", "medium", "architecture");
      }
      if (systemResult.justification) {
        await recordDecision(ctx, `Stack justification: ${(systemResult.justification as string).slice(0, 200)}`, "System Architect", "high", "architecture");
      }
    } catch (e) { console.error("Brain write error (architecture):", e); }

    const totalTokens = subjobs.reduce((sum, s) => sum + (s.tokens_used || 0), 0);
    const totalCost = subjobs.reduce((sum, s) => sum + Number(s.cost_usd || 0), 0);
    const totalDuration = subjobs.reduce((sum, s) => sum + (s.duration_ms || 0), 0);

    const archContent = buildArchitectureContent(completedResults);

    await updateInitiative(ctx, {
      stage_status: "architected",
      architecture_content: archContent.slice(0, 2000),
      suggested_stack: (systemResult.justification as string)?.slice(0, 200) || initiative.suggested_stack,
      discovery_payload: {
        ...dp,
        system_architecture: systemResult,
        data_architecture: dataResult,
        api_architecture: apiResult,
        dependency_graph: depResult,
        layer2_agents_used: ["system_architect", "data_architect", "api_architect", "dependency_planner"],
        layer2_total_tokens: totalTokens,
        layer2_total_cost_usd: totalCost,
        layer2_orchestration: "subjob_v1_bg",
      },
    });

    // Add Layer 2 agents to squad
    const { data: existingSquad } = await serviceClient
      .from("squads").select("id")
      .eq("initiative_id", ctx.initiativeId)
      .order("created_at", { ascending: false })
      .limit(1).single();

    const squadId = existingSquad?.id;
    if (squadId) {
      const layer2Roles = [
        { name: "System Architect", role: "system_architect", desc: "Define stack, camadas e estrutura do projeto" },
        { name: "Data Architect", role: "data_architect", desc: "Modela banco de dados, tabelas, RLS e relacionamentos" },
        { name: "API Architect", role: "api_architect", desc: "Define contratos de API, endpoints e integrações" },
        { name: "Dependency Planner", role: "dependency_planner", desc: "Cria grafo de dependências e ordem de geração" },
      ];
      for (const ag of layer2Roles) {
        const { data: agent } = await serviceClient.from("agents").insert({
          user_id: user.id, name: ag.name, role: ag.role as any,
          description: ag.desc, organization_id: ctx.organizationId,
          workspace_id: initiative.workspace_id, status: "active",
        }).select("id").single();
        if (agent) {
          await serviceClient.from("squad_members").insert({ squad_id: squadId, agent_id: agent.id, role_in_squad: ag.role });
        }
      }
    }

    await completeJob(ctx, jobId, {
      system_architecture: systemResult,
      data_architecture: dataResult,
      api_architecture: apiResult,
      dependency_graph: depResult,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
      orchestration: "subjob_v1_bg",
    }, { model: "multi-agent", costUsd: totalCost, durationMs: totalDuration });

    await pipelineLog(ctx, "pipeline_architecture_complete",
      `Camada 2 concluída (background): ${totalTokens} tokens, $${totalCost.toFixed(4)}, ${totalDuration}ms`,
      { tokens: totalTokens, cost_usd: totalCost, duration_ms: totalDuration }
    );

    await pipelineLog(ctx, "pipeline_architecture_simulation_queued",
      "🌀 Architecture Simulation queued as next stage");

  } catch (e) {
    console.error("Architecture background error:", e);
    await cleanupStuckSubjobs(serviceClient, jobId, 0);
    await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "architecture_ready" });
  }
}
