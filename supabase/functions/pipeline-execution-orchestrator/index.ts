// Execution Orchestrator — builds DAG, dispatches workers, monitors completion
// Replaces monolithic pipeline-execution with distributed worker architecture
// Workers are invoked via supabase.functions.invoke("pipeline-execution-worker")
//
// Sprint 202: Idempotency guards + explicit auto-continuation
// Sprint 203: Canonical traceability — trace_id, attempt_id, wave_number, agent_role

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob, recordAgentMessage } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, recordError } from "../_shared/brain-helpers.ts";
import { buildSmartContextWindow, buildSmartContextWithSemantic } from "../_shared/smart-context.ts";
import {
  buildExecutionDAG, getReadyNodes, hasPendingNodes, markNodeStatus,
  formatExecutionPlan,
  type DAGNode, type ExecutionDAG,
} from "../_shared/dependency-scheduler.ts";
import { computeIncrementalDiff, simpleHash, type IncrementalStats } from "../_shared/incremental-engine.ts";
import { semanticSearch, batchEmbedNodes } from "../_shared/embedding-helpers.ts";

const MAX_WORKERS = 6;
const MAX_RETRIES = 2;
const TIME_BUDGET_MS = 110_000; // 110s — leave 40s buffer before Deno's ~150s timeout

serve(async (req) => {
  const startTime = Date.now();
  const result = await bootstrapPipeline(req, "pipeline-execution-orchestrator");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const dp = initiative.discovery_payload || {};

  // ══════════════════════════════════════════════════════════════
  // Sprint 202 — Idempotency Guard: at most 1 master job per initiative
  // ══════════════════════════════════════════════════════════════
  const { data: existingMasterJobs } = await serviceClient
    .from("initiative_jobs")
    .select("id, created_at")
    .eq("initiative_id", ctx.initiativeId)
    .eq("stage", "execution_orchestrator")
    .eq("status", "running");

  if (existingMasterJobs && existingMasterJobs.length > 0) {
    // Another orchestrator is already running for this initiative
    // Fail the older ones and proceed (we are the newest invocation)
    const existingIds = existingMasterJobs.map(j => j.id);
    await serviceClient
      .from("initiative_jobs")
      .update({
        status: "failed",
        error: "Superseded by new orchestrator invocation (idempotency guard)",
        completed_at: new Date().toISOString(),
      })
      .in("id", existingIds);

    await pipelineLog(ctx, "idempotency_guard",
      `Superseded ${existingIds.length} existing orchestrator job(s)`,
      { superseded_ids: existingIds }
    );
  }

  // ── Cleanup orphaned worker jobs from previous runs ──
  const workerStaleTime = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  await serviceClient
    .from("initiative_jobs")
    .update({ status: "failed", error: "Orphan cleanup: new orchestrator run started", completed_at: new Date().toISOString() })
    .eq("initiative_id", ctx.initiativeId)
    .eq("status", "running")
    .eq("stage", "execution_worker")
    .lt("created_at", workerStaleTime);

  const masterJobId = await createJob(ctx, "execution_orchestrator", { initiative_id: ctx.initiativeId, mode: "swarm" });

  const updateFields: Record<string, unknown> = { stage_status: "in_progress" };
  if (initiative.stage_status === "planned" && !initiative.approved_at_planning) {
    updateFields.approved_at_planning = new Date().toISOString();
  }
  await updateInitiative(ctx, updateFields);
  pipelineLog(ctx, "orchestrator_start", "Orchestrator iniciado — Agent Swarm + DAG Scheduler").catch(() => {});

  try {
    // ── Fetch stories, squad, connections ──
    let { data: stories } = await serviceClient.from("stories")
      .select("id, title, description")
      .eq("initiative_id", ctx.initiativeId)
      .in("status", ["todo", "in_progress"]);

    if (!stories?.length) {
      const { data: allStories } = await serviceClient.from("stories")
        .select("id, title, description")
        .eq("initiative_id", ctx.initiativeId);
      
      if (allStories?.length) {
        await serviceClient.from("stories")
          .update({ status: "todo" })
          .eq("initiative_id", ctx.initiativeId)
          .in("status", ["done", "completed"]);
        stories = allStories;
        pipelineLog(ctx, "stories_reset", `${allStories.length} stories resetadas para re-execução`).catch(() => {});
      } else {
        throw new Error("Nenhuma story encontrada — execute o Planning primeiro");
      }
    }

    const { data: squads } = await serviceClient.from("squads")
      .select("id, squad_members(agent_id, role_in_squad, agents(id, name, role, description, exclusive_authorities))")
      .eq("initiative_id", ctx.initiativeId);
    const squadMembers = squads?.[0]?.squad_members || [];
    if (!squadMembers.length) throw new Error("Nenhum agente no squad");

    const agentsByRole: Record<string, any> = {};
    for (const sm of squadMembers) agentsByRole[sm.role_in_squad] = sm.agents;

    // Create Layer 4 agents if missing
    if (!agentsByRole["code_architect"] && !agentsByRole["developer"] && !agentsByRole["integration_agent"]) {
      const squadId = squads?.[0]?.id;
      if (squadId) {
        const layer4Roles = [
          { name: "Code Architect", role: "code_architect", desc: "Define interfaces, tipos e contratos antes da implementação" },
          { name: "Developer Agent", role: "developer", desc: "Gera código completo e funcional baseado nas especificações" },
          { name: "Integration Agent", role: "integration_agent", desc: "Verifica imports, dependências e conecta componentes" },
        ];
        for (const ag of layer4Roles) {
          const { data: agent } = await serviceClient.from("agents").insert({
            user_id: user.id, name: ag.name, role: ag.role as any,
            description: ag.desc, organization_id: ctx.organizationId,
            workspace_id: initiative.workspace_id, status: "active",
          }).select("id, name, role, description").single();
          if (agent) {
            await serviceClient.from("squad_members").insert({ squad_id: squadId, agent_id: agent.id, role_in_squad: ag.role });
            agentsByRole[ag.role] = agent;
          }
        }
      }
    }

    const effectiveCodeArch = agentsByRole["code_architect"] || agentsByRole["architect"] || squadMembers[0]?.agents;
    const effectiveDev = agentsByRole["developer"] || agentsByRole["dev"] || squadMembers[0]?.agents;
    const effectiveIntegration = agentsByRole["integration_agent"] || agentsByRole["qa"] || squadMembers[0]?.agents;

    // Supabase connection
    let supabaseConnInfo = "";
    const { data: sbConns } = await serviceClient.from("supabase_connections")
      .select("supabase_url, supabase_anon_key, label")
      .eq("organization_id", ctx.organizationId).eq("status", "active")
      .order("updated_at", { ascending: false }).limit(1);
    const sbConn = sbConns?.[0];
    if (sbConn) supabaseConnInfo = `\n\n## Conexão Supabase:\n- URL: ${sbConn.supabase_url}\n- Anon Key: ${sbConn.supabase_anon_key}`;

    // Architecture context
    const dataArchContext = dp.data_architecture ? `\n## Schema DB:\n${JSON.stringify(dp.data_architecture, null, 2).slice(0, 2000)}` : "";
    const apiContext = dp.api_architecture ? `\n## API Contracts:\n${JSON.stringify(dp.api_architecture, null, 2).slice(0, 1500)}` : "";
    const fileTreeContext = dp.file_tree ? `\n## File Tree:\n${JSON.stringify((dp.file_tree as any).generation_order || [], null, 2).slice(0, 1500)}` : "";

    // Memory context
    let memoryContext = "";
    try {
      const { data: memories } = await serviceClient.from("agent_memory")
        .select("key, value, memory_type").eq("organization_id", ctx.organizationId)
        .order("relevance_score", { ascending: false }).limit(10);
      if (memories?.length) {
        memoryContext = `\n## Memória:\n${memories.map(m => `- [${m.memory_type}] ${m.key}: ${m.value}`).join("\n")}`;
      }
    } catch {}

    // ── Collect subtasks ──
    const allSubtasks: Array<{
      id: string; file_path: string | null; file_type: string | null;
      description: string; story_id: string; sort_order: number; phase_id: string;
    }> = [];
    const allProjectFiles: { file_path: string; description: string }[] = [];

    for (const story of stories) {
      await serviceClient.from("stories").update({ status: "in_progress" }).eq("id", story.id);
      const { data: phases } = await serviceClient.from("story_phases")
        .select("id, name, sort_order, story_subtasks(id, description, status, sort_order, file_path, file_type)")
        .eq("story_id", story.id).order("sort_order");

      for (const phase of (phases || [])) {
        await serviceClient.from("story_phases").update({ status: "in_progress" }).eq("id", phase.id);
        for (const st of (phase.story_subtasks || [])) {
          // Sprint 202: Skip already-completed subtasks (idempotency for re-invocations)
          if (st.status === "completed" || st.status === "done") {
            if (st.file_path) {
              // Load existing output for context injection
              const { data: existingOutput } = await serviceClient
                .from("story_subtasks")
                .select("output")
                .eq("id", st.id)
                .single();
              if (existingOutput?.output && st.file_path) {
                allProjectFiles.push({ file_path: st.file_path, description: st.description });
              }
            }
            continue;
          }
          if (st.status !== "pending" && st.status !== "in_progress") continue;
          allSubtasks.push({
            id: st.id, file_path: st.file_path, file_type: st.file_type,
            description: st.description, story_id: story.id, sort_order: st.sort_order,
            phase_id: phase.id,
          });
          if (st.file_path) allProjectFiles.push({ file_path: st.file_path, description: st.description });
        }
      }
    }

    // Sprint 202: If no subtasks to execute (all completed from previous run), finalize
    if (allSubtasks.length === 0) {
      await pipelineLog(ctx, "all_subtasks_complete", "All subtasks already completed — finalizing");

      await serviceClient.from("initiatives").update({
        stage_status: "validating",
        execution_progress: {
          current: 0, total: 0, percent: 100,
          executed: 0, failed: 0, code_files: 0, tokens: 0, cost_usd: 0,
          current_file: null, current_agent: null,
          current_subtask_id: null, current_subtask_description: null,
          current_story_id: null, current_stage: "execution",
          chain_of_agents: true, status: "completed", completed_at: new Date().toISOString(),
          scheduler: "swarm", waves_executed: 0, max_workers: MAX_WORKERS,
          incremental: true, skipped: 0, savings_percent: 0,
          resumed_from_previous: true,
        },
      }).eq("id", ctx.initiativeId);

      if (masterJobId) await completeJob(ctx, masterJobId, {
        resumed: true, all_complete: true, batch_incomplete: false,
      }, { model: "routed", costUsd: 0, durationMs: Date.now() - startTime });

      return jsonResponse({
        success: true, executed: 0, failed: 0, code_files: 0,
        tokens: 0, cost_usd: 0, job_id: masterJobId,
        batch_incomplete: false, all_previously_completed: true,
      });
    }

    const projectStructure = allProjectFiles.map(f => `- ${f.file_path}: ${f.description}`).join("\n");
    const generatedFiles: Record<string, string> = {};

    // ── Incremental Detection ──
    const incremental = await computeIncrementalDiff(ctx, allSubtasks.map(st => ({ ...st, story_id: st.story_id })));
    let incrementalStats: IncrementalStats = incremental.stats;

    if (incremental.stats.cleanFiles > 0) {
      pipelineLog(ctx, "incremental_detection",
        `Incremental: ${incremental.stats.cleanFiles} clean, ${incremental.stats.dirtyFiles} dirty (${incremental.stats.newFiles} new, ${incremental.stats.hashMismatch} changed, ${incremental.stats.cascadeDirty} cascade). Savings: ~${incremental.stats.savingsPercent}%`,
        incremental.stats
      ).catch(() => {});
    }

    // Filter to only dirty subtasks for execution
    const dirtySubtasks = allSubtasks.filter(st => {
      if (!st.file_path) return true;
      return incremental.dirtySubtaskIds.has(st.id);
    });

    // For clean subtasks, batch-load their existing outputs
    const cleanSubtasks = allSubtasks.filter(
      st => st.file_path && incremental.cleanFilePaths.has(st.file_path)
    );
    if (cleanSubtasks.length > 0) {
      const cleanIds = cleanSubtasks.map(st => st.id);
      for (let i = 0; i < cleanIds.length; i += 500) {
        const chunk = cleanIds.slice(i, i + 500);
        const { data: existingOutputs } = await serviceClient
          .from("story_subtasks")
          .select("id, file_path, output")
          .in("id", chunk);
        for (const row of (existingOutputs || [])) {
          if (row.output && row.file_path) {
            generatedFiles[row.file_path] = row.output;
          }
        }
      }
    }

    // ── Build DAG (only dirty file subtasks) ──
    const dirtyFileSubtasks = dirtySubtasks.filter(st => !!st.file_path);
    const dag = await buildExecutionDAG(ctx, dirtyFileSubtasks.map(st => ({ ...st, story_id: st.story_id })));
    const executionPlan = formatExecutionPlan(dag);
    await pipelineLog(ctx, "dag_execution_plan", executionPlan, {
      total_nodes: dag.totalNodes, total_waves: dag.waves.length,
      incremental: true, skipped: incremental.stats.cleanFiles,
    });

    const nonFileSubtasks = dirtySubtasks.filter(st => !st.file_path);

    // ── Execution state ──
    let totalTokens = 0, totalCost = 0, executedCount = 0, failedCount = 0, codeFilesGenerated = 0;
    const totalNodes = dag.totalNodes + nonFileSubtasks.length;
    const skippedCount = incremental.stats.cleanFiles;
    const retryCount: Record<string, number> = {};

    // Debounced progress
    type ExecutionProgressSnapshot = {
      currentFile?: string | null;
      currentAgent?: string | null;
      currentSubtaskId?: string | null;
      currentSubtaskDescription?: string | null;
      currentStoryId?: string | null;
      currentStage?: string | null;
      currentWave?: number | null;
    };

    let lastProgressWrite = 0;
    const PROGRESS_DEBOUNCE_MS = 5000;
    const buildProgressPayload = (snapshot: ExecutionProgressSnapshot = {}) => ({
      current: executedCount + failedCount,
      total: totalNodes,
      percent: totalNodes > 0 ? Math.round(((executedCount + failedCount) / totalNodes) * 100) : 0,
      executed: executedCount,
      failed: failedCount,
      code_files: codeFilesGenerated,
      tokens: totalTokens,
      cost_usd: totalCost,
      current_file: snapshot.currentFile ?? null,
      current_agent: snapshot.currentAgent ?? null,
      current_subtask_id: snapshot.currentSubtaskId ?? null,
      current_subtask_description: snapshot.currentSubtaskDescription ?? null,
      current_story_id: snapshot.currentStoryId ?? null,
      current_stage: snapshot.currentStage ?? "execution",
      current_wave: snapshot.currentWave ?? null,
      total_waves: dag.waves.length,
      chain_of_agents: true,
      started_at: new Date().toISOString(),
      status: "running",
      scheduler: "swarm",
      incremental: true,
      skipped: skippedCount,
      savings_percent: incremental.stats.savingsPercent,
    });
    const writeProgress = async (snapshot: ExecutionProgressSnapshot = {}) => {
      await serviceClient.from("initiatives").update({
        execution_progress: buildProgressPayload(snapshot),
      }).eq("id", ctx.initiativeId);
      lastProgressWrite = Date.now();
    };
    const updateProgress = async (snapshot: ExecutionProgressSnapshot = {}) => {
      const now = Date.now();
      if (now - lastProgressWrite < PROGRESS_DEBOUNCE_MS) return;
      await writeProgress(snapshot);
    };
    await writeProgress({ currentStage: "execution" });

    // ── Worker dispatcher ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const dispatchWorker = async (node: DAGNode, waveNum: number): Promise<void> => {
      markNodeStatus(dag, node.id, "generating");
      await updateProgress({
        currentFile: node.filePath,
        currentAgent: "worker_dispatched",
        currentSubtaskId: node.subtaskId,
        currentSubtaskDescription: node.description,
        currentStoryId: node.storyId,
        currentStage: "execution",
        currentWave: waveNum,
      });

      // ── Smart Context Window + Semantic Search ──
      const depPaths = [...node.dependencies]
        .map(d => dag.nodes.get(d)?.filePath)
        .filter(Boolean) as string[];

      let semanticPaths: string[] = [];
      try {
        const semanticResults = await semanticSearch(
          ctx, `${node.filePath} ${node.description}`, apiKey, 0.4, 5,
        );
        semanticPaths = semanticResults
          .map(r => r.file_path)
          .filter((fp): fp is string => !!fp && fp !== node.filePath && !depPaths.includes(fp));
      } catch {}

      const { context: smartDependencyContext, stats: contextStats } = semanticPaths.length > 0
        ? buildSmartContextWithSemantic(generatedFiles, node.filePath, depPaths, semanticPaths, 12000)
        : buildSmartContextWindow(generatedFiles, node.filePath, depPaths, 12000);

      if (executedCount % 5 === 0 && contextStats.compressionRatio > 0) {
        await pipelineLog(ctx, "smart_context_stats",
          `Smart Context: ${contextStats.compressionRatio}% compression (${contextStats.includedFiles}/${contextStats.totalFiles} files, ${contextStats.originalChars} → ${contextStats.compactChars} chars)`,
          contextStats
        );
      }

      const workerPayload = {
        initiativeId: ctx.initiativeId,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        workspaceId: initiative.workspace_id || null,
        nodeId: node.id,
        subtaskId: node.subtaskId,
        filePath: node.filePath,
        fileType: node.fileType,
        nodeType: node.nodeType,
        fileName: node.fileName,
        storyId: node.storyId,
        description: node.description,
        waveNum,
        projectTitle: initiative.title,
        projectDescription: initiative.refined_idea || initiative.description || "",
        projectStructure,
        dependencyCode: smartDependencyContext,
        otherGeneratedCode: "",
        prdSnippet: initiative.prd_content?.slice(0, 1000) || "",
        architectureSnippet: initiative.architecture_content?.slice(0, 1000) || "",
        dataArchContext,
        apiContext,
        fileTreeContext,
        supabaseConnInfo,
        memoryContext,
        smartContextStats: contextStats,
        codeArchitect: effectiveCodeArch ? { id: effectiveCodeArch.id, name: effectiveCodeArch.name, role: effectiveCodeArch.role, description: effectiveCodeArch.description } : null,
        developer: effectiveDev ? { id: effectiveDev.id, name: effectiveDev.name, role: effectiveDev.role, description: effectiveDev.description } : null,
        integrationAgent: effectiveIntegration ? { id: effectiveIntegration.id, name: effectiveIntegration.name, role: effectiveIntegration.role, description: effectiveIntegration.description } : null,
      };

      try {
        const workerUrl = `${supabaseUrl}/functions/v1/pipeline-execution-worker`;
        const resp = await fetch(workerUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(workerPayload),
        });

        const workerResult = await resp.json();

        if (!resp.ok || !workerResult.success) {
          throw new Error(workerResult.error || `Worker returned status ${resp.status}`);
        }

        if (workerResult.codeContent) {
          generatedFiles[node.filePath] = workerResult.codeContent;
        }
        totalTokens += workerResult.tokens || 0;
        totalCost += workerResult.costUsd || 0;
        markNodeStatus(dag, node.id, "generated");
        codeFilesGenerated++;
        executedCount++;

      } catch (err) {
        const retries = retryCount[node.id] || 0;
        retryCount[node.id] = retries + 1;

        if (retries < MAX_RETRIES) {
          markNodeStatus(dag, node.id, "pending");
          console.warn(`[orchestrator] Retrying ${node.filePath} (attempt ${retries + 2})`);
        } else {
          markNodeStatus(dag, node.id, "failed");
          await serviceClient.from("story_subtasks").update({ status: "failed" }).eq("id", node.subtaskId);
          failedCount++;
          try {
            await recordError(ctx, err instanceof Error ? err.message : "Unknown worker error",
              "execution", node.filePath, `Worker failed after ${retries + 1} attempts`,
              `Ensure dependencies for ${node.filePath} are correct`);
          } catch {}
          console.error(`[orchestrator] Node ${node.filePath} failed permanently:`, err);
        }
      }

      await updateProgress({
        currentFile: node.filePath,
        currentAgent: "completed",
        currentSubtaskId: node.subtaskId,
        currentSubtaskDescription: node.description,
        currentStoryId: node.storyId,
        currentStage: "execution",
        currentWave: waveNum,
      });
    };

    // ── DAG Wave Execution Loop ──
    let waveNum = 0;
    let safetyCounter = 0;
    const maxIterations = dag.totalNodes + 10;
    let timeBudgetExceeded = false;

    while (hasPendingNodes(dag) && safetyCounter < maxIterations) {
      const elapsed = Date.now() - startTime;
      if (elapsed > TIME_BUDGET_MS) {
        timeBudgetExceeded = true;
        await pipelineLog(ctx, "time_budget_pause",
          `Pausa por tempo: ${Math.round(elapsed / 1000)}s elapsed. ${executedCount} executados, continuando automaticamente...`,
          { elapsed_ms: elapsed, executed: executedCount, pending: dag.totalNodes - executedCount - failedCount }
        );
        break;
      }

      safetyCounter++;
      const readyNodes = getReadyNodes(dag);

      if (readyNodes.length === 0) {
        for (const [_, node] of dag.nodes) {
          if (node.status === "pending") {
            markNodeStatus(dag, node.id, "skipped");
            failedCount++;
          }
        }
        break;
      }

      waveNum++;
      pipelineLog(ctx, "swarm_wave_start",
        `Wave ${waveNum}: dispatching ${readyNodes.length} worker(s)`,
        { wave: waveNum, files: readyNodes.map(n => n.filePath) }
      ).catch(() => {});

      for (let i = 0; i < readyNodes.length; i += MAX_WORKERS) {
        const batch = readyNodes.slice(i, i + MAX_WORKERS);
        await Promise.all(batch.map(node => dispatchWorker(node, waveNum)));

        if (Date.now() - startTime > TIME_BUDGET_MS) {
          timeBudgetExceeded = true;
          await pipelineLog(ctx, "time_budget_pause",
            `Pausa mid-wave: tempo limite atingido. Continuando automaticamente...`,
            { wave: waveNum, executed: executedCount }
          );
          break;
        }
      }

      if (timeBudgetExceeded) break;

      pipelineLog(ctx, "swarm_wave_complete",
        `Wave ${waveNum} concluída: ${readyNodes.length} worker(s)`,
        { wave: waveNum, executed: executedCount, failed: failedCount }
      ).catch(() => {});
      await writeProgress({ currentAgent: "wave_complete", currentStage: "execution", currentWave: waveNum });
    }

    // ── Non-file subtasks (sequential, only if time allows) ──
    if (!timeBudgetExceeded) {
      for (const st of nonFileSubtasks) {
        if (Date.now() - startTime > TIME_BUDGET_MS) { timeBudgetExceeded = true; break; }
        try {
          const aiResult = await callAI(apiKey,
            `Você é o Developer "${effectiveDev?.name || "Agent"}". Execute a subtask.`,
            `## Subtask: ${st.description}\n\nProduza o output completo.`
          );
          await serviceClient.from("story_subtasks").update({
            output: aiResult.content, status: "completed", executed_at: new Date().toISOString(),
          }).eq("id", st.id);
          await serviceClient.from("agent_outputs").insert({
            organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
            agent_id: effectiveDev?.id || null, subtask_id: st.id,
            type: "analysis", status: "draft",
            summary: st.description?.slice(0, 200), raw_output: { text: aiResult.content },
            model_used: aiResult.model, tokens_used: aiResult.tokens, cost_estimate: aiResult.costUsd,
          });
          totalTokens += aiResult.tokens;
          totalCost += aiResult.costUsd;
          executedCount++;
        } catch (err) {
          await serviceClient.from("story_subtasks").update({ status: "failed" }).eq("id", st.id);
          failedCount++;
        }
      }
    }

    // ── Check remaining pending subtasks ──
    const { count: remainingPending } = await serviceClient.from("story_subtasks")
      .select("*", { count: "exact", head: true })
      .in("story_id", stories.map(s => s.id))
      .eq("status", "pending");

    const batchIncomplete = timeBudgetExceeded && (remainingPending || 0) > 0;

    if (!batchIncomplete) {
      // ── Finalize stories/phases ──
      for (const story of stories) {
        const { data: phases } = await serviceClient.from("story_phases")
          .select("id").eq("story_id", story.id);
        for (const phase of (phases || [])) {
          const { count: pending } = await serviceClient.from("story_subtasks")
            .select("*", { count: "exact", head: true })
            .eq("phase_id", phase.id).neq("status", "completed");
          if (pending === 0) await serviceClient.from("story_phases").update({ status: "completed" }).eq("id", phase.id);
        }
        const { count: pendingPhases } = await serviceClient.from("story_phases")
          .select("*", { count: "exact", head: true })
          .eq("story_id", story.id).neq("status", "completed");
        if (pendingPhases === 0) await serviceClient.from("stories").update({ status: "done" }).eq("id", story.id);
      }

      // ── Final progress ──
      await serviceClient.from("initiatives").update({
        stage_status: "validating",
        execution_progress: {
          current: totalNodes, total: totalNodes, percent: 100,
          executed: executedCount, failed: failedCount,
          code_files: codeFilesGenerated, tokens: totalTokens, cost_usd: totalCost,
          current_file: null, current_agent: null,
          current_subtask_id: null, current_subtask_description: null,
          current_story_id: null, current_stage: "execution",
          chain_of_agents: true, status: "completed", completed_at: new Date().toISOString(),
          scheduler: "swarm", waves_executed: waveNum, max_workers: MAX_WORKERS,
          incremental: true, skipped: skippedCount,
          savings_percent: incremental.stats.savingsPercent,
        },
      }).eq("id", ctx.initiativeId);

      if (masterJobId) await completeJob(ctx, masterJobId, {
        executed: executedCount, failed: failedCount, code_files: codeFilesGenerated,
        total_tokens: totalTokens, waves_executed: waveNum,
        chain: ["code_architect", "developer", "integration_agent"],
        scheduler: "swarm", max_workers: MAX_WORKERS,
        skipped: skippedCount, savings_percent: incremental.stats.savingsPercent,
        batch_incomplete: false,
      }, { model: "routed", costUsd: totalCost, durationMs: Date.now() - startTime });

      await pipelineLog(ctx, "orchestrator_complete",
        `Orchestrator concluído: ${executedCount} gerados, ${skippedCount} reutilizados (${incremental.stats.savingsPercent}% economia), ${failedCount} falhas, ${waveNum} waves`,
        { total_tokens: totalTokens, cost_usd: totalCost, code_files: codeFilesGenerated, waves: waveNum, skipped: skippedCount }
      );

      // ── Memory extraction ──
      try {
        const memResult = await callAI(apiKey,
          `Extraia lições aprendidas desta execução. Retorne APENAS JSON: {"memories": [{"key": "string", "value": "string (max 200 chars)", "type": "lesson_learned|pattern|architectural_decision|best_practice"}]}`,
          `Projeto: "${initiative.title}", ${executedCount} arquivos gerados em ${waveNum} waves, ${failedCount} falhas. Scheduler: Swarm com ${MAX_WORKERS} workers.`,
          true
        );
        const parsed = JSON.parse(memResult.content);
        const agentIds = squadMembers.map((sm: any) => sm.agents?.id).filter(Boolean);
        for (const mem of (parsed.memories || []).slice(0, 5)) {
          for (const aid of agentIds) {
            await serviceClient.from("agent_memory").insert({
              agent_id: aid, organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
              memory_type: mem.type || "lesson_learned", key: (mem.key || "").slice(0, 200),
              value: (mem.value || "").slice(0, 500), scope: "organization",
            });
          }
        }
      } catch {}

      // ── Batch embed remaining unembedded nodes ──
      try {
        const embedResult = await batchEmbedNodes(ctx, apiKey, 30);
        if (embedResult.embedded > 0) {
          await pipelineLog(ctx, "embeddings_batch",
            `Embeddings gerados: ${embedResult.embedded} nós`,
            embedResult
          );
        }
      } catch {}
    } else {
      // ══════════════════════════════════════════════════════════════
      // Sprint 202 — Auto-continuation: schedule self-invocation
      // ══════════════════════════════════════════════════════════════
      await serviceClient.from("initiatives").update({
        execution_progress: {
          current: executedCount + failedCount, total: totalNodes,
          percent: totalNodes > 0 ? Math.round(((executedCount + failedCount) / totalNodes) * 100) : 0,
          executed: executedCount, failed: failedCount,
          code_files: codeFilesGenerated, tokens: totalTokens, cost_usd: totalCost,
          current_file: null, current_agent: "auto_continuing",
          current_subtask_id: null, current_subtask_description: null,
          current_story_id: null, current_stage: "execution",
          chain_of_agents: true, status: "running",
          scheduler: "swarm", waves_executed: waveNum, max_workers: MAX_WORKERS,
          incremental: true, skipped: skippedCount,
          savings_percent: incremental.stats.savingsPercent,
          batch_incomplete: true, remaining: remainingPending,
          started_at: new Date().toISOString(),
        },
      }).eq("id", ctx.initiativeId);

      // Complete the current master job FIRST to free the slot
      if (masterJobId) await completeJob(ctx, masterJobId, {
        executed: executedCount, failed: failedCount, code_files: codeFilesGenerated,
        total_tokens: totalTokens, waves_executed: waveNum,
        scheduler: "swarm", max_workers: MAX_WORKERS,
        skipped: skippedCount, savings_percent: incremental.stats.savingsPercent,
        batch_incomplete: true, remaining_to_execute: remainingPending || 0,
        pause_reason: "time_budget", auto_continue: true,
      }, { model: "routed", costUsd: totalCost, durationMs: Date.now() - startTime });

      await pipelineLog(ctx, "auto_continue",
        `Batch pausado: ${executedCount} executados, ${remainingPending} restantes. Disparando auto-continuação...`,
        { executed: executedCount, remaining: remainingPending }
      );

      // Sprint 202: Auto-continue — fire-and-forget self-invocation
      // The master job is already completed, so this new invocation gets a fresh slot
      try {
        const continueUrl = `${supabaseUrl}/functions/v1/pipeline-execution-orchestrator`;
        fetch(continueUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initiativeId: ctx.initiativeId }),
        }).catch(err => {
          console.error("[orchestrator] Auto-continue invocation failed:", err);
        });
      } catch (err) {
        console.error("[orchestrator] Auto-continue setup failed:", err);
      }
    }

    return jsonResponse({
      success: true, executed: executedCount, failed: failedCount,
      code_files: codeFilesGenerated, tokens: totalTokens, cost_usd: totalCost,
      job_id: masterJobId, waves_executed: waveNum, skipped: skippedCount,
      scheduler: "swarm", max_workers: MAX_WORKERS,
      savings_percent: incremental.stats.savingsPercent,
      batch_incomplete: batchIncomplete,
      remaining_to_execute: remainingPending || 0,
      auto_continue: batchIncomplete,
    });

  } catch (e) {
    if (masterJobId) await failJob(ctx, masterJobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
