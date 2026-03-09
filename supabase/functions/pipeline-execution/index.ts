// Layer 4 — Implementation (DAG-based Dependency Scheduler)
// Orchestrates: Code Architect → Developer → Integration Agent
// Execution order determined by Project Brain dependency graph
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob, recordAgentMessage } from "../_shared/pipeline-helpers.ts";
import { sanitizePackageJson, DETERMINISTIC_FILES } from "../_shared/code-sanitizers.ts";
import { generateBrainContext, upsertNode, addEdge, getNodeByPath, updateNodeStatus, recordError } from "../_shared/brain-helpers.ts";
import {
  buildExecutionDAG, getReadyNodes, hasPendingNodes, markNodeStatus,
  updateBrainEdgesFromImports, formatExecutionPlan,
  type DAGNode, type ExecutionDAG, type SchedulerConfig,
} from "../_shared/dependency-scheduler.ts";

const SCHEDULER_CONFIG: SchedulerConfig = {
  maxParallelWorkers: 4,
  maxRetries: 2,
};

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-execution");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const dp = initiative.discovery_payload || {};
  const masterJobId = await createJob(ctx, "execution", { initiative_id: ctx.initiativeId, mode: "dag_scheduler" });

  const updateFields: Record<string, unknown> = { stage_status: "in_progress" };
  if (initiative.stage_status === "planned" && !initiative.approved_at_planning) {
    updateFields.approved_at_planning = new Date().toISOString();
  }
  await updateInitiative(ctx, updateFields);
  await pipelineLog(ctx, "pipeline_execution_start", "Camada 4 — Implementação iniciada (DAG Scheduler + Code Architect → Developer → Integration Agent)");

  try {
    // ── Setup: fetch stories, squad, connections ──
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
    const hasChain = !!effectiveCodeArch && !!effectiveDev && !!effectiveIntegration;

    // Supabase connection info
    let supabaseConnInfo = "";
    const { data: sbConns } = await serviceClient.from("supabase_connections")
      .select("supabase_url, supabase_anon_key, label")
      .eq("organization_id", ctx.organizationId).eq("status", "active")
      .order("updated_at", { ascending: false }).limit(1);
    const sbConn = sbConns?.[0];
    if (sbConn) {
      supabaseConnInfo = `\n\n## Conexão Supabase:\n- URL: ${sbConn.supabase_url}\n- Anon Key: ${sbConn.supabase_anon_key}`;
    }

    // Brain context
    let brainContext = "";
    try { brainContext = await generateBrainContext(ctx); } catch (e) { console.error("Brain context error:", e); }
    const brainBlock = brainContext ? `\n\n${brainContext}` : "";

    // Architecture context from Layer 2
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

    const deterministicFiles: Record<string, string> = { ...DETERMINISTIC_FILES };
    if (sbConn) {
      deterministicFiles[".env.example"] = `VITE_SUPABASE_URL=${sbConn.supabase_url}\nVITE_SUPABASE_ANON_KEY=${sbConn.supabase_anon_key}`;
    }

    // ── Collect all subtasks with metadata ──
    const allSubtasks: Array<{
      id: string; file_path: string | null; file_type: string | null;
      description: string; story_id: string; sort_order: number;
      phase_id: string;
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

    // ── Build Execution DAG ──
    const dag = await buildExecutionDAG(ctx, allSubtasks.map(st => ({
      ...st, story_id: st.story_id,
    })));

    const executionPlan = formatExecutionPlan(dag);
    await pipelineLog(ctx, "dag_execution_plan", executionPlan, {
      total_nodes: dag.totalNodes, total_waves: dag.waves.length,
    });

    // Non-file subtasks execute separately
    const nonFileSubtasks = allSubtasks.filter(st => !st.file_path);

    // ── Execution state ──
    let totalTokens = 0, totalCost = 0, executedCount = 0, failedCount = 0, codeFilesGenerated = 0;
    const generatedFiles: Record<string, string> = {};
    const totalNodes = dag.totalNodes + nonFileSubtasks.length;

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
          chain_of_agents: hasChain, started_at: new Date().toISOString(), status: "running",
          scheduler: "dag",
        },
      }).eq("id", ctx.initiativeId);
    };
    await updateProgress();

    // ── Execute worker for a single DAG node ──
    const executeNode = async (node: DAGNode, waveNum: number): Promise<void> => {
      markNodeStatus(dag, node.id, "generating");
      const subtaskJobId = await createJob(ctx, "execution", {
        subtask_id: node.subtaskId, file_path: node.filePath, wave: waveNum,
      });

      await serviceClient.from("story_subtasks").update({
        status: "in_progress", executed_by_agent_id: effectiveDev.id,
      }).eq("id", node.subtaskId);
      await updateProgress(node.filePath, "developer", waveNum);

      try {
        const ext = node.filePath.split(".").pop() || "ts";
        const langMap: Record<string, string> = { tsx: "TypeScript React", ts: "TypeScript", css: "CSS", json: "JSON", sql: "SQL", html: "HTML" };
        const language = langMap[ext] || "TypeScript";
        const isBackend = ["schema", "migration", "edge_function", "seed", "supabase_client", "auth_config"].includes(node.fileType || "");

        // Build context from dependencies (prioritize direct deps)
        const depPaths = [...node.dependencies]
          .map(d => dag.nodes.get(d)?.filePath)
          .filter(Boolean) as string[];
        let contextStr = "";
        // First: direct dependencies
        for (const fp of depPaths) {
          if (generatedFiles[fp]) {
            const entry = `\n--- ${fp} (DEPENDENCY) ---\n${generatedFiles[fp].slice(0, 800)}\n`;
            if (contextStr.length + entry.length > 4000) break;
            contextStr += entry;
          }
        }
        // Then: other generated files
        for (const [fp, content] of Object.entries(generatedFiles)) {
          if (depPaths.includes(fp)) continue;
          const entry = `\n--- ${fp} ---\n${content.slice(0, 400)}\n`;
          if (contextStr.length + entry.length > 6000) break;
          contextStr += entry;
        }

        const baseContext = `## Projeto: ${initiative.title}
## Descrição: ${initiative.refined_idea || initiative.description || ""}
## Estrutura:\n${projectStructure}
## Arquivos gerados:\n${contextStr || "(nenhum)"}
## Arquivo: ${node.filePath}
## Tipo: ${node.fileType || "code"} | Linguagem: ${language}
## Tarefa: ${node.description}
${initiative.prd_content ? `## PRD:\n${initiative.prd_content.slice(0, 1000)}` : ""}
${initiative.architecture_content ? `## Arquitetura:\n${initiative.architecture_content.slice(0, 1000)}` : ""}${dataArchContext}${apiContext}${fileTreeContext}${supabaseConnInfo}${memoryContext}${brainBlock}`;

        // ──── Step 1: CODE ARCHITECT ────
        const codeArchResult = await callAI(apiKey,
          `Você é o Code Architect "${effectiveCodeArch.name}" no AxionOS.
Antes do Developer implementar, você define:
1. Interfaces e tipos TypeScript necessários
2. Contratos de função (parâmetros, retornos)
3. Imports necessários e de onde vêm
4. Padrões de design a seguir
5. Edge cases e validações

Seja técnico e preciso. Foque em ESPECIFICAÇÃO, não implementação.`,
          baseContext
        );
        totalTokens += codeArchResult.tokens;
        totalCost += codeArchResult.costUsd;
        await recordAgentMessage(ctx, {
          storyId: node.storyId, subtaskId: node.subtaskId,
          fromAgent: effectiveCodeArch, toAgent: effectiveDev,
          content: codeArchResult.content, messageType: "handoff",
          iteration: 1, tokens: codeArchResult.tokens, model: codeArchResult.model, stage: "execution",
        });

        // ──── Step 2: DEVELOPER ────
        const backendRules = isBackend ? `\nREGRAS BACKEND:\n- schema (.sql): CREATE TABLE IF NOT EXISTS + RLS + prefixo de tabelas do projeto\n- edge_function: Deno/TS com CORS headers e auth\n- supabase_client: createClient com import.meta.env` : "";
        const devResult = await callAI(apiKey,
          `Você é o Developer "${effectiveDev.name}" no AxionOS.
Recebeu a especificação do Code Architect. Implemente o código COMPLETO.

REGRAS:
- Retorne APENAS o conteúdo do arquivo, sem markdown, sem \`\`\`, sem explicações
- Código COMPLETO e FUNCIONAL
- Siga EXATAMENTE a especificação do Code Architect
- Use shadcn/ui + Tailwind para frontend
${backendRules}

REGRAS package.json:
- NÃO inclua "shadcn/ui" como dependência
- Use "lucide-react" (não "lucide")
- SEMPRE inclua "type": "module"
- Use @vitejs/plugin-react-swc`,
          `${baseContext}\n\n## Especificação do Code Architect:\n${codeArchResult.content}`
        );
        let codeContent = devResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
        totalTokens += devResult.tokens;
        totalCost += devResult.costUsd;
        await recordAgentMessage(ctx, {
          storyId: node.storyId, subtaskId: node.subtaskId,
          fromAgent: effectiveDev, toAgent: effectiveIntegration,
          content: codeContent, messageType: "handoff",
          iteration: 1, tokens: devResult.tokens, model: devResult.model, stage: "execution",
        });

        // ──── Step 3: INTEGRATION AGENT ────
        const integrationResult = await callAI(apiKey,
          `Você é o Integration Agent "${effectiveIntegration.name}" no AxionOS.
Sua função é verificar e corrigir problemas de integração no código gerado:

1. IMPORTS: Todos os imports existem e apontam para arquivos corretos?
2. DEPENDÊNCIAS: O arquivo usa pacotes que estão no package.json?
3. TIPOS: Os tipos usados são compatíveis com as interfaces definidas?
4. CONEXÕES: APIs, hooks e serviços estão conectados corretamente?
5. CONSISTÊNCIA: O código segue os padrões dos outros arquivos do projeto?

Se encontrar problemas, retorne o código CORRIGIDO completo.
Se tudo estiver correto, retorne o código original sem alterações.

REGRA: Retorne APENAS o conteúdo do arquivo, sem markdown, sem \`\`\`, sem explicações.`,
          `## Arquivo: ${node.filePath}
## Especificação do Code Architect:\n${codeArchResult.content.slice(0, 2000)}

## Código do Developer:\n${codeContent.slice(0, 8000)}

## Arquivos já gerados (para verificar imports):\n${contextStr || "(nenhum)"}

Verifique integração e retorne o código final (corrigido se necessário).`
        );
        totalTokens += integrationResult.tokens;
        totalCost += integrationResult.costUsd;

        const integrationCode = integrationResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
        if (integrationCode.length > 20 && !integrationCode.startsWith("{\"")) {
          codeContent = integrationCode;
        }

        await recordAgentMessage(ctx, {
          storyId: node.storyId, subtaskId: node.subtaskId,
          fromAgent: effectiveIntegration, toAgent: effectiveDev,
          content: integrationResult.content, messageType: "review",
          iteration: 1, tokens: integrationResult.tokens, model: integrationResult.model, stage: "execution",
        });

        // Override deterministic files
        if (deterministicFiles[node.filePath]) codeContent = deterministicFiles[node.filePath];
        if (node.filePath === "package.json") codeContent = sanitizePackageJson(codeContent);

        generatedFiles[node.filePath] = codeContent;

        // Persist
        await serviceClient.from("story_subtasks").update({
          output: codeContent, status: "completed", executed_at: new Date().toISOString(),
        }).eq("id", node.subtaskId);

        const { data: artifact } = await serviceClient.from("agent_outputs").insert({
          organization_id: ctx.organizationId, workspace_id: initiative.workspace_id || null,
          initiative_id: ctx.initiativeId, agent_id: effectiveDev.id, subtask_id: node.subtaskId,
          type: "code", status: "draft",
          summary: `${node.filePath} — ${node.description.slice(0, 150)}`,
          raw_output: {
            file_path: node.filePath, file_type: node.fileType,
            language: ext, content: codeContent,
            chain: ["code_architect", "developer", "integration_agent"],
            wave: waveNum,
          },
          model_used: devResult.model, prompt_used: node.description,
          tokens_used: codeArchResult.tokens + devResult.tokens + integrationResult.tokens,
          cost_estimate: codeArchResult.costUsd + devResult.costUsd + integrationResult.costUsd,
        }).select("id").single();

        if (artifact?.id) {
          await serviceClient.from("code_artifacts").insert({
            output_id: artifact.id,
            files_affected: [{ path: node.filePath, type: node.fileType, language: ext }],
            build_status: "pending", test_status: "pending",
          });
        }

        // ──── Update Project Brain ────
        try {
          const existingNode = await getNodeByPath(ctx, node.filePath);
          if (existingNode) {
            await updateNodeStatus(ctx, existingNode.id, "generated");
          } else {
            await upsertNode(ctx, {
              node_type: node.nodeType as any, name: node.fileName,
              file_path: node.filePath, content_hash: String(codeContent.length),
              status: "generated",
            });
          }
          // Extract real imports and create Brain edges
          await updateBrainEdgesFromImports(ctx, node.filePath, codeContent);
        } catch (e) { console.error("Brain update error:", e); }

        if (subtaskJobId) await completeJob(ctx, subtaskJobId, {
          artifact_id: artifact?.id, file_path: node.filePath, wave: waveNum,
        }, devResult);

        markNodeStatus(dag, node.id, "generated");
        codeFilesGenerated++;
        executedCount++;

      } catch (err) {
        node.retries++;
        if (node.retries < SCHEDULER_CONFIG.maxRetries) {
          // Retry: reset to pending
          markNodeStatus(dag, node.id, "pending");
          console.warn(`[scheduler] Retrying ${node.filePath} (attempt ${node.retries + 1})`);
        } else {
          markNodeStatus(dag, node.id, "failed");
          await serviceClient.from("story_subtasks").update({ status: "failed" }).eq("id", node.subtaskId);
          if (subtaskJobId) await failJob(ctx, subtaskJobId, err instanceof Error ? err.message : "Unknown");
          failedCount++;
          // Record error in Brain
          try {
            await recordError(ctx, err instanceof Error ? err.message : "Unknown execution error",
              "execution", node.filePath, `Failed after ${node.retries} retries`, `Ensure dependencies for ${node.filePath} are correct`);
          } catch {}
          console.error(`[scheduler] Node ${node.filePath} failed permanently:`, err);
        }
        await updateProgress(node.filePath, "failed", waveNum);
      }
    };

    // ── DAG Wave Execution Loop ──
    let waveNum = 0;
    let safetyCounter = 0;
    const maxIterations = dag.totalNodes + 10; // prevent infinite loops

    while (hasPendingNodes(dag) && safetyCounter < maxIterations) {
      safetyCounter++;
      const readyNodes = getReadyNodes(dag);

      if (readyNodes.length === 0) {
        // No ready nodes but pending exist — stuck (all remaining have failed deps)
        // Mark remaining as skipped
        for (const [_, node] of dag.nodes) {
          if (node.status === "pending") {
            markNodeStatus(dag, node.id, "skipped");
            failedCount++;
          }
        }
        break;
      }

      waveNum++;
      await pipelineLog(ctx, "dag_wave_start",
        `Wave ${waveNum}: executando ${readyNodes.length} arquivo(s) em paralelo`,
        { wave: waveNum, files: readyNodes.map(n => n.filePath) }
      );

      // Execute wave in batches of maxParallelWorkers
      for (let i = 0; i < readyNodes.length; i += SCHEDULER_CONFIG.maxParallelWorkers) {
        const batch = readyNodes.slice(i, i + SCHEDULER_CONFIG.maxParallelWorkers);
        await Promise.all(batch.map(node => executeNode(node, waveNum)));
      }

      await pipelineLog(ctx, "dag_wave_complete",
        `Wave ${waveNum} concluída: ${readyNodes.length} arquivo(s)`,
        { wave: waveNum, executed: executedCount, failed: failedCount }
      );
    }

    // ── Execute non-file subtasks ──
    for (const st of nonFileSubtasks) {
      try {
        const aiResult = await callAI(apiKey,
          `Você é o Developer "${effectiveDev.name}". Execute a subtask.`,
          `## Subtask: ${st.description}\n\nProduza o output completo.`
        );
        await serviceClient.from("story_subtasks").update({
          output: aiResult.content, status: "completed", executed_at: new Date().toISOString(),
        }).eq("id", st.id);
        await serviceClient.from("agent_outputs").insert({
          organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
          agent_id: effectiveDev.id, subtask_id: st.id,
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
        console.error(`Non-file subtask ${st.id} failed:`, err);
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
        chain_of_agents: hasChain, status: "completed", completed_at: new Date().toISOString(),
        scheduler: "dag", waves_executed: waveNum,
      },
    }).eq("id", ctx.initiativeId);

    if (masterJobId) await completeJob(ctx, masterJobId, {
      executed: executedCount, failed: failedCount, code_files: codeFilesGenerated,
      total_tokens: totalTokens, waves_executed: waveNum,
      chain: ["code_architect", "developer", "integration_agent"],
      scheduler: "dag",
    }, { model: "routed", costUsd: totalCost, durationMs: 0 });

    await pipelineLog(ctx, "pipeline_execution_complete",
      `Camada 4 concluída (DAG): ${executedCount} subtasks (${codeFilesGenerated} arquivos) em ${waveNum} waves, ${failedCount} falhas`,
      { total_tokens: totalTokens, cost_usd: totalCost, code_files: codeFilesGenerated, waves: waveNum }
    );

    // ── Memory extraction ──
    try {
      const memResult = await callAI(apiKey,
        `Extraia lições aprendidas desta execução. Retorne APENAS JSON: {"memories": [{"key": "string", "value": "string (max 200 chars)", "type": "lesson_learned|pattern|architectural_decision|best_practice"}]}`,
        `Projeto: "${initiative.title}", ${executedCount} arquivos gerados em ${waveNum} waves, ${failedCount} falhas. Scheduler: DAG-based.`,
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
      code_files: codeFilesGenerated, chain_of_agents: hasChain,
      tokens: totalTokens, cost_usd: totalCost, job_id: masterJobId,
      waves_executed: waveNum, scheduler: "dag",
    });
  } catch (e) {
    if (masterJobId) await failJob(ctx, masterJobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
