// Execution Orchestrator — builds DAG, dispatches workers, monitors completion
// Replaces monolithic pipeline-execution with distributed worker architecture
// Workers are invoked via supabase.functions.invoke("pipeline-execution-worker")

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob, recordAgentMessage } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, recordError } from "../_shared/brain-helpers.ts";
import {
  buildExecutionDAG, getReadyNodes, hasPendingNodes, markNodeStatus,
  formatExecutionPlan,
  type DAGNode, type ExecutionDAG,
} from "../_shared/dependency-scheduler.ts";

const MAX_WORKERS = 6;
const MAX_RETRIES = 2;

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-execution-orchestrator");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const dp = initiative.discovery_payload || {};
  const masterJobId = await createJob(ctx, "execution_orchestrator", { initiative_id: ctx.initiativeId, mode: "swarm" });

  const updateFields: Record<string, unknown> = { stage_status: "in_progress" };
  if (initiative.stage_status === "planned" && !initiative.approved_at_planning) {
    updateFields.approved_at_planning = new Date().toISOString();
  }
  await updateInitiative(ctx, updateFields);
  await pipelineLog(ctx, "orchestrator_start", "Orchestrator iniciado — Agent Swarm + DAG Scheduler");

  try {
    // ── Fetch stories, squad, connections (same as pipeline-execution) ──
    const { data: stories } = await serviceClient.from("stories")
      .select("id, title, description")
      .eq("initiative_id", ctx.initiativeId)
      .in("status", ["todo", "in_progress"]);
    if (!stories?.length) throw new Error("Nenhuma story encontrada para execução");

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

    // ── Build DAG ──
    const dag = await buildExecutionDAG(ctx, allSubtasks.map(st => ({ ...st, story_id: st.story_id })));
    const executionPlan = formatExecutionPlan(dag);
    await pipelineLog(ctx, "dag_execution_plan", executionPlan, {
      total_nodes: dag.totalNodes, total_waves: dag.waves.length,
    });

    const nonFileSubtasks = allSubtasks.filter(st => !st.file_path);

    // ── Execution state ──
    let totalTokens = 0, totalCost = 0, executedCount = 0, failedCount = 0, codeFilesGenerated = 0;
    const generatedFiles: Record<string, string> = {};
    const totalNodes = dag.totalNodes + nonFileSubtasks.length;
    const retryCount: Record<string, number> = {};

    const updateProgress = async (currentFile?: string, currentAgent?: string, waveNum?: number) => {
      const current = executedCount + failedCount;
      await serviceClient.from("initiatives").update({
        execution_progress: {
          current, total: totalNodes,
          percent: totalNodes > 0 ? Math.round((current / totalNodes) * 100) : 0,
          executed: executedCount, failed: failedCount,
          code_files: codeFilesGenerated, tokens: totalTokens, cost_usd: totalCost,
          current_file: currentFile, current_agent: currentAgent,
          current_wave: waveNum, total_waves: dag.waves.length,
          chain_of_agents: true, started_at: new Date().toISOString(),
          status: "running", scheduler: "swarm",
        },
      }).eq("id", ctx.initiativeId);
    };
    await updateProgress();

    // ── Worker dispatcher ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const dispatchWorker = async (node: DAGNode, waveNum: number): Promise<void> => {
      markNodeStatus(dag, node.id, "generating");
      await updateProgress(node.filePath, "worker_dispatched", waveNum);

      // Build dependency context for this node
      const depPaths = [...node.dependencies]
        .map(d => dag.nodes.get(d)?.filePath)
        .filter(Boolean) as string[];
      let dependencyCode = "";
      for (const fp of depPaths) {
        if (generatedFiles[fp]) {
          const entry = `\n--- ${fp} (DEPENDENCY) ---\n${generatedFiles[fp].slice(0, 800)}\n`;
          if (dependencyCode.length + entry.length > 4000) break;
          dependencyCode += entry;
        }
      }
      let otherGeneratedCode = "";
      for (const [fp, content] of Object.entries(generatedFiles)) {
        if (depPaths.includes(fp)) continue;
        const entry = `\n--- ${fp} ---\n${content.slice(0, 400)}\n`;
        if (otherGeneratedCode.length + entry.length > 3000) break;
        otherGeneratedCode += entry;
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
        dependencyCode,
        otherGeneratedCode,
        prdSnippet: initiative.prd_content?.slice(0, 1000) || "",
        architectureSnippet: initiative.architecture_content?.slice(0, 1000) || "",
        dataArchContext,
        apiContext,
        fileTreeContext,
        supabaseConnInfo,
        memoryContext,
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

      await updateProgress(node.filePath, "completed", waveNum);
    };

    // ── DAG Wave Execution Loop ──
    let waveNum = 0;
    let safetyCounter = 0;
    const maxIterations = dag.totalNodes + 10;

    while (hasPendingNodes(dag) && safetyCounter < maxIterations) {
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
      await pipelineLog(ctx, "swarm_wave_start",
        `Wave ${waveNum}: dispatching ${readyNodes.length} worker(s)`,
        { wave: waveNum, files: readyNodes.map(n => n.filePath) }
      );

      // Execute wave in batches of MAX_WORKERS
      for (let i = 0; i < readyNodes.length; i += MAX_WORKERS) {
        const batch = readyNodes.slice(i, i + MAX_WORKERS);
        await Promise.all(batch.map(node => dispatchWorker(node, waveNum)));
      }

      await pipelineLog(ctx, "swarm_wave_complete",
        `Wave ${waveNum} concluída: ${readyNodes.length} worker(s)`,
        { wave: waveNum, executed: executedCount, failed: failedCount }
      );
    }

    // ── Non-file subtasks (sequential) ──
    for (const st of nonFileSubtasks) {
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
        chain_of_agents: true, status: "completed", completed_at: new Date().toISOString(),
        scheduler: "swarm", waves_executed: waveNum, max_workers: MAX_WORKERS,
      },
    }).eq("id", ctx.initiativeId);

    if (masterJobId) await completeJob(ctx, masterJobId, {
      executed: executedCount, failed: failedCount, code_files: codeFilesGenerated,
      total_tokens: totalTokens, waves_executed: waveNum,
      chain: ["code_architect", "developer", "integration_agent"],
      scheduler: "swarm", max_workers: MAX_WORKERS,
    }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });

    await pipelineLog(ctx, "orchestrator_complete",
      `Orchestrator concluído: ${executedCount} arquivos (${codeFilesGenerated} código) em ${waveNum} waves, ${failedCount} falhas, ${MAX_WORKERS} max workers`,
      { total_tokens: totalTokens, cost_usd: totalCost, code_files: codeFilesGenerated, waves: waveNum }
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

    return jsonResponse({
      success: true, executed: executedCount, failed: failedCount,
      code_files: codeFilesGenerated, tokens: totalTokens, cost_usd: totalCost,
      job_id: masterJobId, waves_executed: waveNum,
      scheduler: "swarm", max_workers: MAX_WORKERS,
    });

  } catch (e) {
    if (masterJobId) await failJob(ctx, masterJobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
