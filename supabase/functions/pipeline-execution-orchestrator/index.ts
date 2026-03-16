// Execution Orchestrator — builds DAG, dispatches workers, monitors completion
// Replaces monolithic pipeline-execution with distributed worker architecture
// Workers are invoked via supabase.functions.invoke("pipeline-execution-worker")

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
  // ── Cleanup orphaned worker jobs from previous runs for this initiative ──
  const workerStaleTime = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  await serviceClient
    .from("initiative_jobs")
    .update({ status: "failed", error: "Orphan cleanup: new orchestrator run started", completed_at: new Date().toISOString() })
    .eq("initiative_id", ctx.initiativeId)
    .eq("status", "running")
    .in("stage", ["execution_worker", "execution_orchestrator"])
    .lt("created_at", workerStaleTime);

  const masterJobId = await createJob(ctx, "execution_orchestrator", { initiative_id: ctx.initiativeId, mode: "swarm" });

  const updateFields: Record<string, unknown> = { stage_status: "in_progress" };
  if (initiative.stage_status === "planned" && !initiative.approved_at_planning) {
    updateFields.approved_at_planning = new Date().toISOString();
  }
  await updateInitiative(ctx, updateFields);
  // Non-blocking — orchestrator start log
  pipelineLog(ctx, "orchestrator_start", "Orchestrator iniciado — Agent Swarm + DAG Scheduler").catch(() => {});

  try {
    // ── Fetch stories, squad, connections (same as pipeline-execution) ──
    // First try pending stories; if all already done, reset them for re-execution
    let { data: stories } = await serviceClient.from("stories")
      .select("id, title, description")
      .eq("initiative_id", ctx.initiativeId)
      .in("status", ["todo", "in_progress"]);

    if (!stories?.length) {
      // Check if stories exist but are already completed — reset them for re-run
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
          if (st.status !== "pending") continue;
          allSubtasks.push({
            id: st.id, file_path: st.file_path, file_type: st.file_type,
            description: st.description, story_id: story.id, sort_order: st.sort_order,
            phase_id: phase.id,
          });
          if (st.file_path) allProjectFiles.push({ file_path: st.file_path, description: st.description });
        }
      }
    }

    const projectStructure = allProjectFiles.map(f => `- ${f.file_path}: ${f.description}`).join("\n");
    const generatedFiles: Record<string, string> = {};

    // ── Incremental Detection ──
    const incremental = await computeIncrementalDiff(ctx, allSubtasks.map(st => ({ ...st, story_id: st.story_id })));
    let incrementalStats: IncrementalStats = incremental.stats;

    if (incremental.stats.cleanFiles > 0) {
      // Non-blocking informational log
      pipelineLog(ctx, "incremental_detection",
        `Incremental: ${incremental.stats.cleanFiles} clean, ${incremental.stats.dirtyFiles} dirty (${incremental.stats.newFiles} new, ${incremental.stats.hashMismatch} changed, ${incremental.stats.cascadeDirty} cascade). Savings: ~${incremental.stats.savingsPercent}%`,
        incremental.stats
      ).catch(() => {});
    }

    // Filter to only dirty subtasks for execution
    const dirtySubtasks = allSubtasks.filter(st => {
      if (!st.file_path) return true; // non-file subtasks always run
      return incremental.dirtySubtaskIds.has(st.id);
    });

    // For clean subtasks, batch-load their existing outputs in one query
    const cleanSubtasks = allSubtasks.filter(
      st => st.file_path && incremental.cleanFilePaths.has(st.file_path)
    );
    if (cleanSubtasks.length > 0) {
      const cleanIds = cleanSubtasks.map(st => st.id);
      // Batch in chunks of 500 (PostgREST .in() limit)
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
    // generatedFiles already pre-populated with clean file outputs above
    const totalNodes = dag.totalNodes + nonFileSubtasks.length;
    const skippedCount = incremental.stats.cleanFiles;
    const retryCount: Record<string, number> = {};

    // Debounced progress: write at most once every 5 seconds or on wave boundaries
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
      if (now - lastProgressWrite < PROGRESS_DEBOUNCE_MS) return; // skip — too recent
      await writeProgress(snapshot);
    };
    await writeProgress({ currentStage: "execution" }); // initial write always fires

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

      // Use semantic search to find related files beyond explicit dependencies
      let semanticPaths: string[] = [];
      try {
        const semanticResults = await semanticSearch(
          ctx,
          `${node.filePath} ${node.description}`,
          apiKey,
          0.4,
          5,
        );
        semanticPaths = semanticResults
          .map(r => r.file_path)
          .filter((fp): fp is string => !!fp && fp !== node.filePath && !depPaths.includes(fp));
      } catch {}

      const { context: smartDependencyContext, stats: contextStats } = semanticPaths.length > 0
        ? buildSmartContextWithSemantic(generatedFiles, node.filePath, depPaths, semanticPaths, 12000)
        : buildSmartContextWindow(generatedFiles, node.filePath, depPaths, 12000);

      // Log compression stats periodically
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
        // Smart Context Window — compact API surfaces instead of full files
        dependencyCode: smartDependencyContext,
        otherGeneratedCode: "", // already included in smart context
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
        // Invoke worker Edge Function
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

        // Worker succeeded — store generated code for context injection
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
      // ── Time budget check: stop before Deno timeout ──
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
      // Non-blocking wave log — fire-and-forget
      pipelineLog(ctx, "swarm_wave_start",
        `Wave ${waveNum}: dispatching ${readyNodes.length} worker(s)`,
        { wave: waveNum, files: readyNodes.map(n => n.filePath) }
      ).catch(() => {});

      // Execute wave in batches of MAX_WORKERS
      for (let i = 0; i < readyNodes.length; i += MAX_WORKERS) {
        const batch = readyNodes.slice(i, i + MAX_WORKERS);
        await Promise.all(batch.map(node => dispatchWorker(node, waveNum)));

        // Check time budget between micro-batches too
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

      // Non-blocking wave complete log + force progress write at wave boundary
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

    // ── Check if there are remaining pending subtasks ──
    const { count: remainingPending } = await serviceClient.from("story_subtasks")
      .select("*", { count: "exact", head: true })
      .in("story_id", stories.map(s => s.id))
      .eq("status", "pending");

    const batchIncomplete = timeBudgetExceeded && (remainingPending || 0) > 0;

    if (!batchIncomplete) {
      // ── Finalize stories/phases (only when all done) ──
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
      }, { model: "routed", costUsd: totalCost, durationMs: 0 });

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

      // ── Batch embed any remaining unembedded nodes ──
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
      // ── Batch incomplete: update progress but keep stage_status as in_progress ──
      await serviceClient.from("initiatives").update({
        execution_progress: {
          current: executedCount + failedCount, total: totalNodes,
          percent: totalNodes > 0 ? Math.round(((executedCount + failedCount) / totalNodes) * 100) : 0,
          executed: executedCount, failed: failedCount,
          code_files: codeFilesGenerated, tokens: totalTokens, cost_usd: totalCost,
          chain_of_agents: true, status: "running",
          scheduler: "swarm", waves_executed: waveNum, max_workers: MAX_WORKERS,
          incremental: true, skipped: skippedCount,
          savings_percent: incremental.stats.savingsPercent,
          batch_incomplete: true, remaining: remainingPending,
          started_at: new Date().toISOString(),
        },
      }).eq("id", ctx.initiativeId);

      await pipelineLog(ctx, "batch_pause",
        `Batch pausado: ${executedCount} executados, ${remainingPending} restantes. Auto-continuando...`,
        { executed: executedCount, remaining: remainingPending }
      );
    }

    return jsonResponse({
      success: true, executed: executedCount, failed: failedCount,
      code_files: codeFilesGenerated, tokens: totalTokens, cost_usd: totalCost,
      job_id: masterJobId, waves_executed: waveNum, skipped: skippedCount,
      scheduler: "swarm", max_workers: MAX_WORKERS,
      savings_percent: incremental.stats.savingsPercent,
      batch_incomplete: batchIncomplete,
      remaining_to_execute: remainingPending || 0,
    });

  } catch (e) {
    if (masterJobId) await failJob(ctx, masterJobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
