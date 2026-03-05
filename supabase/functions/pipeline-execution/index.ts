// Layer 4 — Implementation
// Orchestrates: Code Architect → Developer → Integration Agent
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob, recordAgentMessage } from "../_shared/pipeline-helpers.ts";
import { sanitizePackageJson, DETERMINISTIC_FILES } from "../_shared/code-sanitizers.ts";
import { generateBrainContext, upsertNode, addEdge, getNodeByPath, updateNodeStatus } from "../_shared/brain-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-execution");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const dp = initiative.discovery_payload || {};
  const masterJobId = await createJob(ctx, "execution", { initiative_id: ctx.initiativeId });

  const updateFields: Record<string, unknown> = { stage_status: "in_progress" };
  if (initiative.stage_status === "planned" && !initiative.approved_at_planning) {
    updateFields.approved_at_planning = new Date().toISOString();
  }
  await updateInitiative(ctx, updateFields);
  await pipelineLog(ctx, "pipeline_execution_start", "Camada 4 — Implementação iniciada (Code Architect → Developer → Integration Agent)");

  try {
    // Fetch stories
    const { data: stories } = await serviceClient.from("stories")
      .select("id, title, description")
      .eq("initiative_id", ctx.initiativeId)
      .in("status", ["todo", "in_progress"]);
    if (!stories?.length) throw new Error("Nenhuma story encontrada para execução");

    // Fetch squad agents
    const { data: squads } = await serviceClient.from("squads")
      .select("id, squad_members(agent_id, role_in_squad, agents(id, name, role, description, exclusive_authorities))")
      .eq("initiative_id", ctx.initiativeId);
    const squadMembers = squads?.[0]?.squad_members || [];
    if (!squadMembers.length) throw new Error("Nenhum agente no squad");

    const agentsByRole: Record<string, any> = {};
    for (const sm of squadMembers) agentsByRole[sm.role_in_squad] = sm.agents;

    // Layer 4 agents (with fallback to old roles)
    const codeArchAgent = agentsByRole["code_architect"] || agentsByRole["architect"];
    const devAgent = agentsByRole["developer"] || agentsByRole["dev"];
    const integrationAgent = agentsByRole["integration_agent"] || agentsByRole["qa"];
    const defaultAgent = devAgent || codeArchAgent || squadMembers[0]?.agents;
    const hasChain = !!codeArchAgent && !!devAgent && !!integrationAgent;

    // Create Layer 4 agents if not in squad
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

    const effectiveCodeArch = agentsByRole["code_architect"] || codeArchAgent || defaultAgent;
    const effectiveDev = agentsByRole["developer"] || devAgent || defaultAgent;
    const effectiveIntegration = agentsByRole["integration_agent"] || integrationAgent || defaultAgent;

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

    // Collect all project files
    const allProjectFiles: { file_path: string; description: string }[] = [];
    for (const story of stories) {
      const { data: phases } = await serviceClient.from("story_phases")
        .select("id, story_subtasks(file_path, description)").eq("story_id", story.id);
      for (const phase of (phases || [])) {
        for (const st of (phase.story_subtasks || [])) {
          if (st.file_path) allProjectFiles.push({ file_path: st.file_path, description: st.description });
        }
      }
    }
    const projectStructure = allProjectFiles.map(f => `- ${f.file_path}: ${f.description}`).join("\n");

    // Brain context for consistent code generation
    let brainContext = "";
    try {
      brainContext = await generateBrainContext(ctx);
    } catch (e) { console.error("Brain context error:", e); }
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

    let totalTokens = 0, totalCost = 0, executedCount = 0, failedCount = 0, codeFilesGenerated = 0;
    const generatedFiles: Record<string, string> = {};
    const deterministicFiles: Record<string, string> = { ...DETERMINISTIC_FILES };
    if (sbConn) {
      deterministicFiles[".env.example"] = `VITE_SUPABASE_URL=${sbConn.supabase_url}\nVITE_SUPABASE_ANON_KEY=${sbConn.supabase_anon_key}`;
    }

    // Count total subtasks
    let totalSubtasks = 0;
    for (const story of stories) {
      const { data: phases } = await serviceClient.from("story_phases")
        .select("id, story_subtasks(id, status)").eq("story_id", story.id);
      for (const phase of (phases || [])) {
        totalSubtasks += (phase.story_subtasks || []).filter((st: any) => st.status === "pending").length;
      }
    }

    const updateProgress = async (current: number, currentFile?: string, currentAgent?: string) => {
      await serviceClient.from("initiatives").update({
        execution_progress: {
          current, total: totalSubtasks,
          percent: totalSubtasks > 0 ? Math.round((current / totalSubtasks) * 100) : 0,
          executed: executedCount, failed: failedCount,
          code_files: codeFilesGenerated, tokens: totalTokens, cost_usd: totalCost,
          current_file: currentFile, current_agent: currentAgent,
          chain_of_agents: hasChain, started_at: new Date().toISOString(), status: "running",
        },
      }).eq("id", ctx.initiativeId);
    };
    await updateProgress(0);

    for (const story of stories) {
      await serviceClient.from("stories").update({ status: "in_progress" }).eq("id", story.id);
      const { data: phases } = await serviceClient.from("story_phases")
        .select("id, name, sort_order, story_subtasks(id, description, status, sort_order, file_path, file_type)")
        .eq("story_id", story.id).order("sort_order");
      if (!phases) continue;

      for (const phase of phases) {
        await serviceClient.from("story_phases").update({ status: "in_progress" }).eq("id", phase.id);
        const subtasks = (phase.story_subtasks || [])
          .filter((st: any) => st.status === "pending")
          .sort((a: any, b: any) => a.sort_order - b.sort_order);

        const PARALLEL_TYPES = new Set(["config", "scaffold", "style"]);
        const parallelSubtasks = subtasks.filter((st: any) => st.file_type && PARALLEL_TYPES.has(st.file_type));
        const sequentialSubtasks = subtasks.filter((st: any) => !st.file_type || !PARALLEL_TYPES.has(st.file_type));

        const executeSubtask = async (subtask: any) => {
          const hasFilePath = !!subtask.file_path;
          const subtaskJobId = await createJob(ctx, "execution", {
            subtask_id: subtask.id, file_path: subtask.file_path,
          });

          await serviceClient.from("story_subtasks").update({
            status: "in_progress", executed_by_agent_id: effectiveDev.id,
          }).eq("id", subtask.id);
          await updateProgress(executedCount + failedCount, subtask.file_path, "developer");

          try {
            if (hasFilePath) {
              const ext = subtask.file_path.split(".").pop() || "ts";
              const langMap: Record<string, string> = { tsx: "TypeScript React", ts: "TypeScript", css: "CSS", json: "JSON", sql: "SQL", html: "HTML" };
              const language = langMap[ext] || "TypeScript";
              const isBackend = ["schema", "migration", "edge_function", "seed", "supabase_client", "auth_config"].includes(subtask.file_type || "");

              const contextFiles = Object.entries(generatedFiles);
              let contextStr = "";
              for (const [fp, content] of contextFiles) {
                const entry = `\n--- ${fp} ---\n${content.slice(0, 600)}\n`;
                if (contextStr.length + entry.length > 5000) break;
                contextStr += entry;
              }

              const baseContext = `## Projeto: ${initiative.title}
## Descrição: ${initiative.refined_idea || initiative.description || ""}
## Estrutura:\n${projectStructure}
## Arquivos gerados:\n${contextStr || "(nenhum)"}
## Arquivo: ${subtask.file_path}
## Tipo: ${subtask.file_type || "code"} | Linguagem: ${language}
## Tarefa: ${subtask.description}
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
                storyId: story.id, subtaskId: subtask.id,
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
                storyId: story.id, subtaskId: subtask.id,
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
                `## Arquivo: ${subtask.file_path}
## Especificação do Code Architect:\n${codeArchResult.content.slice(0, 2000)}

## Código do Developer:\n${codeContent.slice(0, 8000)}

## Arquivos já gerados (para verificar imports):\n${contextStr || "(nenhum)"}

Verifique integração e retorne o código final (corrigido se necessário).`
              );
              totalTokens += integrationResult.tokens;
              totalCost += integrationResult.costUsd;

              const integrationCode = integrationResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
              // Use integration result if it looks like valid code (not just review text)
              if (integrationCode.length > 20 && !integrationCode.startsWith("{\"")) {
                codeContent = integrationCode;
              }

              await recordAgentMessage(ctx, {
                storyId: story.id, subtaskId: subtask.id,
                fromAgent: effectiveIntegration, toAgent: effectiveDev,
                content: integrationResult.content, messageType: "review",
                iteration: 1, tokens: integrationResult.tokens, model: integrationResult.model, stage: "execution",
              });

              // Override deterministic files
              if (deterministicFiles[subtask.file_path]) codeContent = deterministicFiles[subtask.file_path];
              if (subtask.file_path === "package.json") codeContent = sanitizePackageJson(codeContent);

              generatedFiles[subtask.file_path] = codeContent;
              await serviceClient.from("story_subtasks").update({
                output: codeContent, status: "completed", executed_at: new Date().toISOString(),
              }).eq("id", subtask.id);

              const { data: artifact } = await serviceClient.from("agent_outputs").insert({
                organization_id: ctx.organizationId, workspace_id: initiative.workspace_id || null,
                initiative_id: ctx.initiativeId, agent_id: effectiveDev.id, subtask_id: subtask.id,
                type: "code", status: "draft",
                summary: `${subtask.file_path} — ${subtask.description.slice(0, 150)}`,
                raw_output: {
                  file_path: subtask.file_path, file_type: subtask.file_type,
                  language: ext, content: codeContent,
                  chain: ["code_architect", "developer", "integration_agent"],
                },
                model_used: devResult.model, prompt_used: subtask.description,
                tokens_used: codeArchResult.tokens + devResult.tokens + integrationResult.tokens,
                cost_estimate: codeArchResult.costUsd + devResult.costUsd + integrationResult.costUsd,
              }).select("id").single();

              if (artifact?.id) {
                await serviceClient.from("code_artifacts").insert({
                  output_id: artifact.id,
                  files_affected: [{ path: subtask.file_path, type: subtask.file_type, language: ext }],
                  build_status: "pending", test_status: "pending",
                });
              }

              // ──── Update Project Brain: mark node as generated ────
              try {
                const existingNode = await getNodeByPath(ctx, subtask.file_path);
                if (existingNode) {
                  await updateNodeStatus(ctx, existingNode.id, "generated");
                } else {
                  const nodeType = subtask.file_type === "page" ? "page" : subtask.file_type === "hook" ? "hook" : subtask.file_type === "service" ? "service" : subtask.file_type === "component" ? "component" : "file";
                  await upsertNode(ctx, { node_type: nodeType as any, name: subtask.file_path.split("/").pop() || subtask.file_path, file_path: subtask.file_path, content_hash: String(codeContent.length), status: "generated" });
                }
              } catch (e) { console.error("Brain update error:", e); }

              if (subtaskJobId) await completeJob(ctx, subtaskJobId, { artifact_id: artifact?.id, file_path: subtask.file_path }, devResult);
              codeFilesGenerated++;

            } else {
              // Non-code subtask
              const aiResult = await callAI(apiKey,
                `Você é o Developer "${effectiveDev.name}". Execute a subtask.`,
                `## Story: ${story.title}\n## Subtask: ${subtask.description}\n\nProduza o output completo.`
              );
              await serviceClient.from("story_subtasks").update({
                output: aiResult.content, status: "completed", executed_at: new Date().toISOString(),
              }).eq("id", subtask.id);
              await serviceClient.from("agent_outputs").insert({
                organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
                agent_id: effectiveDev.id, subtask_id: subtask.id,
                type: "analysis", status: "draft",
                summary: subtask.description?.slice(0, 200), raw_output: { text: aiResult.content },
                model_used: aiResult.model, tokens_used: aiResult.tokens, cost_estimate: aiResult.costUsd,
              });
              if (subtaskJobId) await completeJob(ctx, subtaskJobId, {}, aiResult);
              totalTokens += aiResult.tokens;
              totalCost += aiResult.costUsd;
            }

            executedCount++;
            await updateProgress(executedCount + failedCount, subtask.file_path, "completed");
          } catch (err) {
            await serviceClient.from("story_subtasks").update({ status: "failed" }).eq("id", subtask.id);
            if (subtaskJobId) await failJob(ctx, subtaskJobId, err instanceof Error ? err.message : "Unknown");
            failedCount++;
            await updateProgress(executedCount + failedCount);
            console.error(`Subtask ${subtask.id} failed:`, err);
          }
        };

        // Parallel batch for config/scaffold
        const BATCH = 3;
        for (let i = 0; i < parallelSubtasks.length; i += BATCH) {
          await Promise.all(parallelSubtasks.slice(i, i + BATCH).map(executeSubtask));
        }
        for (const st of sequentialSubtasks) await executeSubtask(st);

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

    // Final progress
    await serviceClient.from("initiatives").update({
      stage_status: "validating",
      execution_progress: {
        current: totalSubtasks, total: totalSubtasks, percent: 100,
        executed: executedCount, failed: failedCount,
        code_files: codeFilesGenerated, tokens: totalTokens, cost_usd: totalCost,
        chain_of_agents: hasChain, status: "completed", completed_at: new Date().toISOString(),
      },
    }).eq("id", ctx.initiativeId);

    if (masterJobId) await completeJob(ctx, masterJobId, {
      executed: executedCount, failed: failedCount, code_files: codeFilesGenerated,
      total_tokens: totalTokens, chain: ["code_architect", "developer", "integration_agent"],
    }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });

    await pipelineLog(ctx, "pipeline_execution_complete",
      `Camada 4 concluída: ${executedCount} subtasks (${codeFilesGenerated} arquivos), ${failedCount} falhas`,
      { total_tokens: totalTokens, cost_usd: totalCost, code_files: codeFilesGenerated }
    );

    // Memory extraction
    try {
      const memResult = await callAI(apiKey,
        `Extraia lições aprendidas desta execução. Retorne APENAS JSON: {"memories": [{"key": "string", "value": "string (max 200 chars)", "type": "lesson_learned|pattern|architectural_decision|best_practice"}]}`,
        `Projeto: "${initiative.title}", ${executedCount} arquivos gerados, ${failedCount} falhas.`,
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
    });
  } catch (e) {
    if (masterJobId) await failJob(ctx, masterJobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
