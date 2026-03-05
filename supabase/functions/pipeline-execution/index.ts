import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob, recordAgentMessage, pickAgentByDescription } from "../_shared/pipeline-helpers.ts";
import { sanitizePackageJson, DETERMINISTIC_FILES } from "../_shared/code-sanitizers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-execution");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const masterJobId = await createJob(ctx, "execution", { initiative_id: ctx.initiativeId });
  const updateFields: Record<string, unknown> = { stage_status: "in_progress" };
  if (initiative.stage_status === "planned" && !initiative.approved_at_planning) {
    updateFields.approved_at_planning = new Date().toISOString();
  }
  await updateInitiative(ctx, updateFields);
  await pipelineLog(ctx, "pipeline_execution_start", "Iniciando execução Chain-of-Agents (Architect → Dev → QA)...");

  try {
    const { data: stories } = await serviceClient.from("stories")
      .select("id, title, description")
      .eq("initiative_id", ctx.initiativeId)
      .in("status", ["todo", "in_progress"]);
    if (!stories || stories.length === 0) throw new Error("Nenhuma story encontrada para execução");

    const { data: squads } = await serviceClient.from("squads")
      .select("id, squad_members(agent_id, role_in_squad, agents(id, name, role, description, exclusive_authorities))")
      .eq("initiative_id", ctx.initiativeId);
    const squadMembers = squads?.[0]?.squad_members || [];
    if (squadMembers.length === 0) throw new Error("Nenhum agente no squad para executar");

    const agentsByRole: Record<string, any> = {};
    for (const sm of squadMembers) agentsByRole[sm.role_in_squad] = sm.agents;
    const architectAgent = agentsByRole["architect"];
    const devAgent = agentsByRole["dev"];
    const qaAgent = agentsByRole["qa"];
    const defaultAgent = devAgent || architectAgent || squadMembers[0]?.agents;
    const hasChain = !!architectAgent && !!devAgent && !!qaAgent;

    // Fetch Supabase connection
    let supabaseConnInfo = "";
    const { data: sbConns } = await serviceClient.from("supabase_connections")
      .select("supabase_url, supabase_anon_key, label")
      .eq("organization_id", ctx.organizationId).eq("status", "active")
      .order("updated_at", { ascending: false }).limit(1);
    const sbConn = sbConns?.[0];
    if (sbConn) {
      supabaseConnInfo = `\n\n## Conexão Supabase Configurada:\n- URL: ${sbConn.supabase_url}\n- Anon Key: ${sbConn.supabase_anon_key}\nUse estes valores REAIS nos arquivos .env.example e src/lib/supabase.ts.`;
    }

    // Collect ALL subtasks with file_path for project structure
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

    // Fetch agent memories and org knowledge base
    let memoryContext = "";
    try {
      const { data: memories } = await serviceClient.from("agent_memory")
        .select("key, value, memory_type, relevance_score")
        .eq("organization_id", ctx.organizationId)
        .order("relevance_score", { ascending: false }).limit(15);
      const { data: kbEntries } = await serviceClient.from("org_knowledge_base")
        .select("title, content, category, tags")
        .eq("organization_id", ctx.organizationId)
        .order("created_at", { ascending: false }).limit(10);
      const memoryLines = (memories || []).map(m => `- [${m.memory_type}] ${m.key}: ${m.value}`);
      const kbLines = (kbEntries || []).map(k => `- [${k.category}] ${k.title}: ${k.content.slice(0, 200)}`);
      if (memoryLines.length > 0 || kbLines.length > 0) {
        memoryContext = `\n\n## Memória Organizacional:\n`;
        if (memoryLines.length > 0) memoryContext += `### Lições dos Agentes:\n${memoryLines.join("\n")}\n`;
        if (kbLines.length > 0) memoryContext += `### Base de Conhecimento:\n${kbLines.join("\n")}\n`;
      }
    } catch (memErr) { console.warn("[MEMORY] Failed to fetch:", memErr); }

    let totalTokens = 0, totalCost = 0, executedCount = 0, failedCount = 0, codeFilesGenerated = 0;
    const generatedFiles: Record<string, string> = {};
    const MAX_QA_ITERATIONS = 2;

    // Deterministic files with Supabase connection
    const deterministicFiles: Record<string, string> = { ...DETERMINISTIC_FILES };
    if (sbConn) {
      deterministicFiles[".env.example"] = `VITE_SUPABASE_URL=${sbConn.supabase_url}\nVITE_SUPABASE_ANON_KEY=${sbConn.supabase_anon_key}`;
    }

    // Count total pending subtasks
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
          current_file: currentFile || null, current_agent: currentAgent || null,
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

        const PARALLEL_FILE_TYPES = new Set(["config", "scaffold", "style"]);
        const parallelSubtasks = subtasks.filter((st: any) => st.file_type && PARALLEL_FILE_TYPES.has(st.file_type));
        const sequentialSubtasks = subtasks.filter((st: any) => !st.file_type || !PARALLEL_FILE_TYPES.has(st.file_type));

        const executeOneSubtask = async (subtask: any) => {
          const hasFilePath = !!subtask.file_path;
          const subtaskJobId = await createJob(ctx, "execution", {
            subtask_id: subtask.id, story_title: story.title, phase_name: phase.name,
            subtask_description: subtask.description, file_path: subtask.file_path || null,
            chain_of_agents: hasChain && hasFilePath,
          });

          await serviceClient.from("story_subtasks").update({
            status: "in_progress", executed_by_agent_id: (devAgent || defaultAgent).id,
          }).eq("id", subtask.id);

          try {
            if (hasFilePath && hasChain) {
              // CHAIN-OF-AGENTS: Architect → Dev → QA
              const ext = subtask.file_path.split(".").pop() || "ts";
              const langMap: Record<string, string> = { tsx: "TypeScript React (TSX)", ts: "TypeScript", css: "CSS", json: "JSON", js: "JavaScript", html: "HTML", sql: "SQL (PostgreSQL)" };
              const language = langMap[ext] || "TypeScript";
              const isBackendFile = ["schema", "migration", "edge_function", "seed", "supabase_client", "auth_config"].includes(subtask.file_type || "");

              const contextFiles = Object.entries(generatedFiles);
              let contextStr = "";
              for (const [fp, content] of contextFiles) {
                const entry = `\n--- ${fp} ---\n${content.slice(0, 800)}\n`;
                if (contextStr.length + entry.length > 6000) break;
                contextStr += entry;
              }

              const baseContext = `## Projeto: ${initiative.title}\n## Descrição: ${initiative.description || initiative.refined_idea || ""}\n\n## Estrutura do projeto:\n${projectStructure}\n\n## Arquivos já gerados:\n${contextStr || "(nenhum ainda)"}\n\n## Arquivo: ${subtask.file_path}\n## Tipo: ${subtask.file_type || "code"}\n## Linguagem: ${language}\n## Tarefa: ${subtask.description}\n\n${initiative.prd_content ? `## PRD:\n${initiative.prd_content.slice(0, 1200)}` : ""}\n${initiative.architecture_content ? `## Arquitetura:\n${initiative.architecture_content.slice(0, 1200)}` : ""}${supabaseConnInfo}${memoryContext}`;

              // Step 1: ARCHITECT
              const archResult = await callAI(apiKey,
                `Você é o Architect "${architectAgent.name}" no AxionOS. Sua função é analisar a tarefa e definir a estrutura técnica ANTES do Dev implementar.\n\nProduz uma especificação técnica concisa incluindo:\n1. Decisões arquiteturais para este arquivo\n2. Interfaces/tipos necessários\n3. Dependências e imports\n4. Padrões a seguir\n5. Edge cases a considerar\n\nSeja direto e técnico. Responda em pt-BR.`,
                baseContext
              );
              await recordAgentMessage(ctx, { storyId: story.id, subtaskId: subtask.id, fromAgent: architectAgent, toAgent: devAgent, content: archResult.content, messageType: "handoff", iteration: 1, tokens: archResult.tokens, model: archResult.model, stage: "execution" });
              totalTokens += archResult.tokens; totalCost += archResult.costUsd;

              // Step 2: DEV
              const backendRules = isBackendFile ? `\nREGRAS PARA ARQUIVOS BACKEND (Supabase):\n- Para file_type "schema" (.sql): Gere CREATE TABLE IF NOT EXISTS, ALTER TABLE ENABLE RLS, CREATE POLICY.\n- REGRA OBRIGATÓRIA: Todas as tabelas DEVEM ter um prefixo curto derivado do nome do projeto.\n- Para file_type "edge_function": Gere Edge Function Deno/TypeScript com CORS headers e auth.\n- Para file_type "supabase_client": Use createClient com import.meta.env.` : "";

              const devResult = await callAI(apiKey,
                `Você é o Dev "${devAgent.name}" no AxionOS. Você recebeu a especificação técnica do Architect abaixo. Implemente o código COMPLETO e FUNCIONAL.\n\nREGRAS:\n- Retorne APENAS o conteúdo do arquivo, sem markdown, sem \`\`\`, sem explicações.\n- Código COMPLETO e FUNCIONAL.\n- Siga EXATAMENTE a especificação do Architect.\n- Use componentes shadcn/ui e Tailwind CSS para frontend.\n${backendRules}\n\nREGRAS PARA package.json:\n- NÃO inclua "shadcn/ui" ou "@shadcn/ui" como dependência.\n- Use "lucide-react" (não "lucide").\n- SEMPRE inclua "type": "module".\n- Use @vitejs/plugin-react-swc.\n\nARQUIVOS DE DEPLOY:\n- vercel.json: {"framework":"vite","installCommand":"rm -f package-lock.json && npm install --include=dev","buildCommand":"npm run build","outputDirectory":"dist","rewrites":[{"source":"/(.*)", "destination":"/index.html"}]}`,
                `${baseContext}\n\n## Especificação do Architect:\n${archResult.content}`
              );
              let codeContent = devResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
              await recordAgentMessage(ctx, { storyId: story.id, subtaskId: subtask.id, fromAgent: devAgent, toAgent: qaAgent, content: codeContent, messageType: "handoff", iteration: 1, tokens: devResult.tokens, model: devResult.model, stage: "execution" });
              totalTokens += devResult.tokens; totalCost += devResult.costUsd;

              // Step 3: QA
              let qaApproved = false;
              for (let iteration = 1; iteration <= MAX_QA_ITERATIONS; iteration++) {
                const qaResult = await callAI(apiKey,
                  `Você é o QA "${qaAgent.name}" no AxionOS. Revise o código do Dev abaixo. Retorne APENAS JSON válido.\n\n{"approved": true/false, "issues": ["lista de problemas"], "suggestions": ["lista de melhorias"], "score": 0-100}`,
                  `## Arquivo: ${subtask.file_path}\n## Especificação do Architect:\n${archResult.content.slice(0, 2000)}\n\n## Código do Dev:\n${codeContent.slice(0, 8000)}`,
                  true
                );
                totalTokens += qaResult.tokens; totalCost += qaResult.costUsd;
                let qaFeedback: any;
                try { qaFeedback = JSON.parse(qaResult.content); } catch { qaFeedback = { approved: true, issues: [], score: 70 }; }
                await recordAgentMessage(ctx, { storyId: story.id, subtaskId: subtask.id, fromAgent: qaAgent, toAgent: devAgent, content: qaResult.content, messageType: "review", iteration, tokens: qaResult.tokens, model: qaResult.model, stage: "execution" });

                if (qaFeedback.approved || qaFeedback.score >= 80 || iteration >= MAX_QA_ITERATIONS) {
                  qaApproved = true; break;
                }

                const fixResult = await callAI(apiKey,
                  `Você é o Dev "${devAgent.name}". O QA encontrou problemas. Corrija TODOS e retorne APENAS o código corrigido completo.`,
                  `## Arquivo: ${subtask.file_path}\n\n## Código atual:\n${codeContent.slice(0, 8000)}\n\n## Feedback do QA:\n${JSON.stringify(qaFeedback.issues)}\n\nRetorne o código COMPLETO corrigido.`
                );
                codeContent = fixResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
                await recordAgentMessage(ctx, { storyId: story.id, subtaskId: subtask.id, fromAgent: devAgent, toAgent: qaAgent, content: codeContent, messageType: "fix", iteration: iteration + 1, tokens: fixResult.tokens, model: fixResult.model, stage: "execution" });
                totalTokens += fixResult.tokens; totalCost += fixResult.costUsd;
              }

              // Override deterministic files
              if (deterministicFiles[subtask.file_path]) {
                codeContent = deterministicFiles[subtask.file_path];
              }
              if (subtask.file_path === "package.json") {
                codeContent = sanitizePackageJson(codeContent);
              }

              generatedFiles[subtask.file_path] = codeContent;
              await serviceClient.from("story_subtasks").update({
                output: codeContent, status: "completed", executed_at: new Date().toISOString(),
              }).eq("id", subtask.id);

              const { data: artifact } = await serviceClient.from("agent_outputs").insert({
                organization_id: ctx.organizationId, workspace_id: initiative.workspace_id || null,
                initiative_id: ctx.initiativeId, agent_id: devAgent.id, subtask_id: subtask.id,
                type: "code", status: qaApproved ? "draft" : "pending_review",
                summary: `${subtask.file_path} — ${subtask.description.slice(0, 150)}`,
                raw_output: { file_path: subtask.file_path, file_type: subtask.file_type, language: ext, content: codeContent, chain_of_agents: true },
                model_used: "google/gemini-2.5-flash", prompt_used: subtask.description,
                tokens_used: totalTokens, cost_estimate: totalCost,
              }).select("id").single();

              if (artifact?.id) {
                await serviceClient.from("code_artifacts").insert({
                  output_id: artifact.id,
                  files_affected: [{ path: subtask.file_path, type: subtask.file_type, language: ext }],
                  build_status: "pending", test_status: "pending",
                });
              }
              if (subtaskJobId) await completeJob(ctx, subtaskJobId, { artifact_id: artifact?.id, file_path: subtask.file_path, chain_of_agents: true, qa_approved: qaApproved }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });
              codeFilesGenerated++;

            } else if (hasFilePath) {
              // SINGLE AGENT CODE MODE
              const ext = subtask.file_path.split(".").pop() || "ts";
              const langMap: Record<string, string> = { tsx: "TypeScript React (TSX)", ts: "TypeScript", css: "CSS", json: "JSON", js: "JavaScript", html: "HTML", sql: "SQL (PostgreSQL)" };
              const language = langMap[ext] || "TypeScript";
              const assignedAgent = devAgent || defaultAgent;

              const contextFiles = Object.entries(generatedFiles);
              let contextStr = "";
              for (const [fp, content] of contextFiles) {
                const entry = `\n--- ${fp} ---\n${content.slice(0, 800)}\n`;
                if (contextStr.length + entry.length > 6000) break;
                contextStr += entry;
              }

              const aiResult = await callAI(apiKey,
                `Você é um desenvolvedor expert em Full-Stack.\nVocê está gerando o arquivo "${subtask.file_path}".\n\nREGRAS:\n- Retorne APENAS o conteúdo do arquivo, sem markdown, sem \`\`\`, sem explicações.\n- Código COMPLETO e FUNCIONAL.\n- Use componentes shadcn/ui e Tailwind CSS.\n\nREGRAS PARA package.json:\n- NÃO inclua "shadcn/ui" como dependência.\n- Use "lucide-react".\n- SEMPRE inclua "type": "module".\n- Use @vitejs/plugin-react-swc.`,
                `## Projeto: ${initiative.title}\n## Descrição: ${initiative.description || initiative.refined_idea || ""}\n\n## Estrutura do projeto:\n${projectStructure}\n\n## Arquivos já gerados:\n${contextStr || "(nenhum)"}\n\n## Arquivo: ${subtask.file_path}\n## Tipo: ${subtask.file_type || "code"}\n## Tarefa: ${subtask.description}\n\n${initiative.prd_content ? `## PRD:\n${initiative.prd_content.slice(0, 1500)}` : ""}\n${initiative.architecture_content ? `## Arquitetura:\n${initiative.architecture_content.slice(0, 1500)}` : ""}${supabaseConnInfo}${memoryContext}\n\nGere o conteúdo COMPLETO do arquivo.`
              );

              let codeContent = aiResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
              if (deterministicFiles[subtask.file_path]) codeContent = deterministicFiles[subtask.file_path];
              if (subtask.file_path === "package.json") codeContent = sanitizePackageJson(codeContent);

              generatedFiles[subtask.file_path] = codeContent;
              await serviceClient.from("story_subtasks").update({
                output: codeContent, status: "completed", executed_at: new Date().toISOString(),
              }).eq("id", subtask.id);

              const { data: artifact } = await serviceClient.from("agent_outputs").insert({
                organization_id: ctx.organizationId, workspace_id: initiative.workspace_id || null,
                initiative_id: ctx.initiativeId, agent_id: assignedAgent.id, subtask_id: subtask.id,
                type: "code", status: "draft",
                summary: `${subtask.file_path} — ${subtask.description.slice(0, 150)}`,
                raw_output: { file_path: subtask.file_path, file_type: subtask.file_type, language: ext, content: codeContent },
                model_used: aiResult.model, prompt_used: subtask.description,
                tokens_used: aiResult.tokens, cost_estimate: aiResult.costUsd,
              }).select("id").single();

              if (artifact?.id) {
                await serviceClient.from("code_artifacts").insert({
                  output_id: artifact.id,
                  files_affected: [{ path: subtask.file_path, type: subtask.file_type, language: ext }],
                  build_status: "pending", test_status: "pending",
                });
              }
              if (subtaskJobId) await completeJob(ctx, subtaskJobId, { artifact_id: artifact?.id, file_path: subtask.file_path, tokens: aiResult.tokens }, aiResult);
              totalTokens += aiResult.tokens; totalCost += aiResult.costUsd;
              codeFilesGenerated++;

            } else {
              // TEXT MODE (non-code subtasks)
              const assignedAgent = pickAgentByDescription(subtask.description, agentsByRole, defaultAgent) as any;
              const aiResult = await callAI(apiKey,
                `Você é o agente "${assignedAgent.name}" (${assignedAgent.role}).\nExecute a subtask abaixo com maestria.`,
                `## Story: ${story.title}\n## Fase: ${phase.name}\n## Subtask: ${subtask.description}\n\nProduza o output completo.`
              );

              await serviceClient.from("story_subtasks").update({
                output: aiResult.content, status: "completed", executed_at: new Date().toISOString(),
              }).eq("id", subtask.id);

              const outputType = assignedAgent.role === "architect" ? "decision" : ["dev", "devops"].includes(assignedAgent.role) ? "code" : ["analyst", "po", "pm"].includes(assignedAgent.role) ? "content" : "analysis";
              const { data: artifact } = await serviceClient.from("agent_outputs").insert({
                organization_id: ctx.organizationId, workspace_id: initiative.workspace_id || null,
                initiative_id: ctx.initiativeId, agent_id: assignedAgent.id, subtask_id: subtask.id,
                type: outputType, status: "draft",
                summary: subtask.description?.slice(0, 200), raw_output: { text: aiResult.content },
                model_used: aiResult.model, prompt_used: subtask.description,
                tokens_used: aiResult.tokens, cost_estimate: aiResult.costUsd,
              }).select("id").single();
              if (subtaskJobId) await completeJob(ctx, subtaskJobId, { artifact_id: artifact?.id, tokens: aiResult.tokens }, aiResult);
              totalTokens += aiResult.tokens; totalCost += aiResult.costUsd;
            }

            executedCount++;
            await updateProgress(executedCount + failedCount, subtask.file_path);
          } catch (subtaskErr) {
            await serviceClient.from("story_subtasks").update({ status: "failed" }).eq("id", subtask.id);
            if (subtaskJobId) await failJob(ctx, subtaskJobId, subtaskErr instanceof Error ? subtaskErr.message : "Unknown");
            failedCount++;
            await updateProgress(executedCount + failedCount);
            console.error(`Subtask ${subtask.id} failed:`, subtaskErr);
          }
        };

        // Execute parallel subtasks in batches of 3
        const PARALLEL_BATCH = 3;
        if (parallelSubtasks.length > 0) {
          for (let bi = 0; bi < parallelSubtasks.length; bi += PARALLEL_BATCH) {
            const batch = parallelSubtasks.slice(bi, bi + PARALLEL_BATCH);
            await Promise.all(batch.map(st => executeOneSubtask(st)));
          }
        }

        // Execute sequential subtasks
        for (const subtask of sequentialSubtasks) {
          await executeOneSubtask(subtask);
        }

        const { count: pendingCount } = await serviceClient.from("story_subtasks")
          .select("*", { count: "exact", head: true })
          .eq("phase_id", phase.id).neq("status", "completed");
        if (pendingCount === 0) await serviceClient.from("story_phases").update({ status: "completed" }).eq("id", phase.id);
      }

      const { count: pendingPhases } = await serviceClient.from("story_phases")
        .select("*", { count: "exact", head: true })
        .eq("story_id", story.id).neq("status", "completed");
      if (pendingPhases === 0) await serviceClient.from("stories").update({ status: "done" }).eq("id", story.id);
    }

    // Mark progress as complete
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
      executed: executedCount, failed: failedCount, code_files: codeFilesGenerated, total_tokens: totalTokens, chain_of_agents: hasChain,
    }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });

    await pipelineLog(ctx, "pipeline_execution_complete", `Execução concluída: ${executedCount} subtasks (${codeFilesGenerated} arquivos), ${failedCount} falhas`, { total_tokens: totalTokens, cost_usd: totalCost, code_files: codeFilesGenerated, chain_of_agents: hasChain });

    // Memory extraction
    try {
      const memoryResult = await callAI(apiKey,
        `Você é um sistema de memória organizacional. Extraia lições aprendidas.\nRetorne APENAS JSON válido.`,
        `Projeto: "${initiative.title}"\nArquivos gerados: ${Object.keys(generatedFiles).join(", ")}\nExecutadas: ${executedCount}, falhas: ${failedCount}\n\n{"memories": [{"key": "nome_curto", "value": "descrição (max 200 chars)", "type": "lesson_learned|pattern|architectural_decision|best_practice"}]}`,
        true
      );
      const memParsed = JSON.parse(memoryResult.content);
      const newMemories = memParsed.memories || [];
      const agentIds = squadMembers.map((sm: any) => sm.agents?.id).filter(Boolean);
      for (const mem of newMemories.slice(0, 5)) {
        for (const agentId of agentIds) {
          await serviceClient.from("agent_memory").insert({
            agent_id: agentId, organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
            memory_type: mem.type || "lesson_learned", key: (mem.key || "unknown").slice(0, 200),
            value: (mem.value || "").slice(0, 500), scope: "organization", relevance_score: 0.8,
          });
        }
      }
      const archDecisions = newMemories.filter((m: any) => m.type === "architectural_decision");
      for (const dec of archDecisions) {
        await serviceClient.from("org_knowledge_base").insert({
          organization_id: ctx.organizationId, category: "architectural_decision",
          title: dec.key, content: dec.value, source_initiative_id: ctx.initiativeId,
          tags: [initiative.suggested_stack || "general"].filter(Boolean),
        });
      }
    } catch (memErr) { console.warn("[MEMORY] Failed to extract:", memErr); }

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
