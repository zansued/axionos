import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callDeepSeek(apiKey: string, systemPrompt: string, userPrompt: string, jsonMode = false) {
  const start = Date.now();
  const body: any = {
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const resp = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`DeepSeek error ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  const durationMs = Date.now() - start;
  const tokens = data.usage?.total_tokens || 0;
  const costUsd = tokens * 0.00000014;
  return { content: data.choices?.[0]?.message?.content || "", tokens, durationMs, costUsd, model: "deepseek-chat" };
}

function pickAgent(description: string, agentsByRole: Record<string, any>, fallback: any) {
  const lower = description.toLowerCase();
  if (/arquitetura|design|padr[ãa]o|diagrama|componente/i.test(lower) && agentsByRole["architect"]) return agentsByRole["architect"];
  if (/teste|qa|qualidade|validar|cenário/i.test(lower) && agentsByRole["qa"]) return agentsByRole["qa"];
  if (/deploy|ci\/cd|infra|docker|pipeline/i.test(lower) && agentsByRole["devops"]) return agentsByRole["devops"];
  if (/ux|interface|usabilidade|layout|wireframe/i.test(lower) && agentsByRole["ux_expert"]) return agentsByRole["ux_expert"];
  if (/requisito|análise|negócio|stakeholder/i.test(lower) && agentsByRole["analyst"]) return agentsByRole["analyst"];
  if (/história|prioridade|backlog|aceite/i.test(lower) && agentsByRole["po"]) return agentsByRole["po"];
  if (/sprint|cerimônia|impedimento|equipe/i.test(lower) && agentsByRole["sm"]) return agentsByRole["sm"];
  if (/código|implementar|api|endpoint|função|banco/i.test(lower) && agentsByRole["dev"]) return agentsByRole["dev"];
  return fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { allowed } = await checkRateLimit(user.id, "run-initiative-pipeline");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { initiativeId, stage, comment, github_token, owner, repo, base_branch } = await req.json();
    if (!initiativeId || !stage) throw new Error("initiativeId and stage are required");

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const { data: initiative, error: initErr } = await serviceClient
      .from("initiatives").select("*").eq("id", initiativeId).single();
    if (initErr || !initiative) throw new Error("Initiative not found");

    const log = async (action: string, message: string, meta: any = {}) => {
      await serviceClient.from("audit_logs").insert({
        user_id: user.id, action, category: "pipeline", entity_type: "initiatives",
        entity_id: initiativeId, message, severity: "info",
        organization_id: initiative.organization_id, metadata: meta,
      });
    };

    const updateInit = async (fields: any) => {
      await serviceClient.from("initiatives").update(fields).eq("id", initiativeId);
    };

    const createJob = async (jobStage: string, inputs: any) => {
      const { data } = await serviceClient.from("initiative_jobs").insert({
        initiative_id: initiativeId, stage: jobStage, status: "running", inputs, user_id: user.id,
      }).select("id").single();
      return data?.id;
    };

    const completeJob = async (jobId: string, outputs: any, result: any) => {
      await serviceClient.from("initiative_jobs").update({
        status: "success", outputs, model: result.model, cost_usd: result.costUsd,
        duration_ms: result.durationMs, completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    };

    const failJob = async (jobId: string, error: string) => {
      await serviceClient.from("initiative_jobs").update({
        status: "failed", error, completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    };

    // ========== STAGE 1: DISCOVERY ==========
    if (stage === "discovery") {
      const jobId = await createJob("discovery", { title: initiative.title, description: initiative.description });
      await updateInit({ stage_status: "discovering" });
      await log("pipeline_discovery_start", "Iniciando descoberta inteligente...");

      try {
        const result = await callDeepSeek(
          DEEPSEEK_API_KEY,
          `Você é um consultor de produto e estratégia sênior. Analise a ideia do usuário e produza uma descoberta inteligente completa. Retorne APENAS JSON válido.`,
          `Ideia do usuário: "${initiative.title}"
${initiative.description ? `Descrição: ${initiative.description}` : ""}

Produza uma análise completa no seguinte formato JSON:
{
  "refined_idea": "Versão refinada e expandida da ideia original (2-3 parágrafos)",
  "business_model": "Modelo de negócio sugerido com justificativa",
  "mvp_scope": "Definição clara do MVP",
  "complexity": "low|medium|high|critical",
  "risk_level": "low|medium|high|critical",
  "suggested_stack": "Stack tecnológica sugerida",
  "strategic_vision": "Visão estratégica em 3 horizontes",
  "market_analysis": "Análise de mercado e concorrentes",
  "feasibility_analysis": "Análise de viabilidade técnica e de negócio",
  "target_user": "Público-alvo principal",
  "initial_estimate": {
    "effort_weeks": 0,
    "team_size": 0,
    "estimated_stories": 0,
    "complexity_score": 0
  }
}`,
          true
        );

        const discovery = JSON.parse(result.content);
        await updateInit({
          stage_status: "discovered",
          idea_raw: initiative.description || initiative.title,
          refined_idea: discovery.refined_idea?.slice(0, 500),
          business_model: discovery.business_model?.slice(0, 300),
          mvp_scope: discovery.mvp_scope?.slice(0, 300),
          complexity: discovery.complexity,
          risk_level: discovery.risk_level,
          target_user: discovery.target_user,
          discovery_payload: discovery,
        });

        if (jobId) await completeJob(jobId, discovery, result);
        await log("pipeline_discovery_complete", "Descoberta inteligente concluída", { tokens: result.tokens, cost_usd: result.costUsd });

        return new Response(JSON.stringify({ success: true, discovery, tokens: result.tokens, job_id: jobId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        await updateInit({ stage_status: "draft" });
        throw e;
      }
    }

    // ========== STAGE 2: SQUAD FORMATION ==========
    if (stage === "squad_formation") {
      const dp = initiative.discovery_payload || {};
      const jobId = await createJob("squad_formation", { complexity: initiative.complexity, refined_idea: initiative.refined_idea });
      await updateInit({ stage_status: "forming_squad" });
      await log("pipeline_squad_start", "Formando squad de agentes...");

      try {
        const context = `Projeto: ${initiative.title}
Ideia refinada: ${dp.refined_idea || initiative.refined_idea || initiative.description || ""}
Complexidade: ${initiative.complexity}
Stack sugerida: ${dp.suggested_stack || "A definir"}
MVP: ${dp.mvp_scope || initiative.mvp_scope || "A definir"}`;

        const result = await callDeepSeek(
          DEEPSEEK_API_KEY,
          "Você é um especialista em montagem de equipes de IA para desenvolvimento de software. Monte o squad ideal. Retorne APENAS JSON válido.",
          `${context}

Papéis disponíveis: analyst, pm, architect, sm, dev, qa, devops, ux_expert, po
Para projetos simples: 3-4 agentes. Médios: 5-6. Complexos: 6-8.

JSON: {"agents": [{"name": "string", "role": "string", "description": "string", "justification": "string"}], "squad_strategy": "string"}`,
          true
        );

        const { agents, squad_strategy } = JSON.parse(result.content);

        const { data: squad } = await serviceClient.from("squads").insert({
          initiative_id: initiativeId,
          name: `Squad ${initiative.title.slice(0, 30)}`,
          auto_generated: true,
          organization_id: initiative.organization_id,
        }).select().single();

        const createdAgents = [];
        for (const ag of agents) {
          const { data: agentData } = await serviceClient.from("agents").insert({
            user_id: user.id, name: ag.name, role: ag.role,
            description: `${ag.description}\n\nJustificativa: ${ag.justification}`,
            organization_id: initiative.organization_id,
            workspace_id: initiative.workspace_id, status: "active",
          }).select("id, name, role").single();

          if (agentData && squad) {
            await serviceClient.from("squad_members").insert({
              squad_id: squad.id, agent_id: agentData.id, role_in_squad: ag.role,
            });
            createdAgents.push(agentData);
          }
        }

        await updateInit({ stage_status: "squad_formed" });
        if (jobId) await completeJob(jobId, { agents: createdAgents, squad_id: squad?.id, strategy: squad_strategy }, result);
        await log("pipeline_squad_complete", `Squad formado: ${createdAgents.length} agentes`, { tokens: result.tokens, cost_usd: result.costUsd });

        return new Response(JSON.stringify({
          success: true, squad_id: squad?.id, agents: createdAgents,
          strategy: squad_strategy, tokens: result.tokens, job_id: jobId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        await updateInit({ stage_status: "discovered" });
        throw e;
      }
    }

    // ========== STAGE 3: PLANNING ==========
    if (stage === "planning") {
      const dp = initiative.discovery_payload || {};
      const jobId = await createJob("planning", { title: initiative.title });
      await updateInit({ stage_status: "planning" });
      await log("pipeline_planning_start", "Iniciando formalização técnica...");

      try {
        const context = `Projeto: ${initiative.title}
Ideia refinada: ${dp.refined_idea || initiative.refined_idea || ""}
Modelo de Negócio: ${dp.business_model || initiative.business_model || "N/A"}
MVP: ${dp.mvp_scope || initiative.mvp_scope || "N/A"}
Stack: ${dp.suggested_stack || "N/A"}
Visão Estratégica: ${dp.strategic_vision || "N/A"}`;

        const prdResult = await callDeepSeek(
          DEEPSEEK_API_KEY,
          "Você é um Product Manager sênior. Crie um PRD detalhado e executável em português brasileiro usando markdown.",
          `${context}\n\nCrie um PRD completo incluindo:\n## Visão Geral\n## Problema a Resolver\n## Personas e Casos de Uso\n## Requisitos Funcionais\n## Requisitos Não-Funcionais\n## Critérios de Aceite\n## Dependências Técnicas\n## Métricas de Sucesso\n## Riscos e Mitigações`
        );
        await updateInit({ prd_content: prdResult.content });

        const archResult = await callDeepSeek(
          DEEPSEEK_API_KEY,
          "Você é um Arquiteto de Software sênior. Crie um documento de arquitetura técnica baseado no PRD. Use markdown.",
          `PRD:\n${prdResult.content.slice(0, 6000)}\n\nStack sugerida: ${dp.suggested_stack || "A definir"}\n\nCrie a arquitetura incluindo:\n## Stack Tecnológica Final\n## Arquitetura do Sistema\n## Componentes Principais\n## Modelo de Dados\n## APIs e Contratos\n## Segurança\n## Escalabilidade\n## Plano de Deploy`
        );
        await updateInit({ architecture_content: archResult.content });

        const storiesResult = await callDeepSeek(
          DEEPSEEK_API_KEY,
          "Você é um Product Manager sênior. Gere user stories executáveis. Retorne APENAS JSON válido.",
          `Projeto: ${initiative.title}\n\nPRD:\n${prdResult.content.slice(0, 4000)}\n\nArquitetura:\n${archResult.content.slice(0, 4000)}\n\nGere 3-8 user stories com fases e subtasks.\nJSON: {"stories": [{"title": "string", "description": "string", "priority": "low|medium|high|critical", "phases": [{"name": "string", "subtasks": ["string"]}]}]}`,
          true
        );
        const { stories } = JSON.parse(storiesResult.content);

        const createdStories = [];
        for (const story of stories) {
          const { data: storyData } = await serviceClient.from("stories").insert({
            user_id: user.id, title: story.title, description: story.description,
            priority: story.priority || "medium", status: "todo",
            organization_id: initiative.organization_id,
            workspace_id: initiative.workspace_id, initiative_id: initiativeId,
          }).select("id").single();

          if (!storyData) continue;
          for (let pi = 0; pi < (story.phases || []).length; pi++) {
            const phase = story.phases[pi];
            const { data: phaseData } = await serviceClient.from("story_phases").insert({
              story_id: storyData.id, name: phase.name, sort_order: pi,
            }).select("id").single();
            if (phaseData) {
              for (let si = 0; si < (phase.subtasks || []).length; si++) {
                await serviceClient.from("story_subtasks").insert({
                  phase_id: phaseData.id, description: phase.subtasks[si], sort_order: si,
                });
              }
            }
          }
          createdStories.push({ id: storyData.id, title: story.title });
        }

        await updateInit({ stage_status: "planned" });
        const totalTokens = prdResult.tokens + archResult.tokens + storiesResult.tokens;
        const totalCost = prdResult.costUsd + archResult.costUsd + storiesResult.costUsd;
        if (jobId) await completeJob(jobId, { stories_count: createdStories.length, total_tokens: totalTokens }, { model: "deepseek-chat", costUsd: totalCost, durationMs: prdResult.durationMs + archResult.durationMs + storiesResult.durationMs });
        await log("pipeline_planning_complete", `Planning completo: ${createdStories.length} stories`, { totalTokens, cost_usd: totalCost });

        return new Response(JSON.stringify({
          success: true, stories: createdStories, tokens: totalTokens, job_id: jobId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        await updateInit({ stage_status: "squad_formed" });
        throw e;
      }
    }

    // ========== APPROVE STAGE ==========
    if (stage === "approve") {
      const currentStatus = initiative.stage_status;

      const approvalMap: Record<string, { field: string; nextStatus: string }> = {
        discovered: { field: "approved_at_discovery", nextStatus: "squad_ready" },
        squad_formed: { field: "approved_at_squad", nextStatus: "planning_ready" },
        planned: { field: "approved_at_planning", nextStatus: "in_progress" },
        ready_to_publish: { field: "approved_at_planning", nextStatus: "published" },
      };

      const approval = approvalMap[currentStatus];
      if (!approval) throw new Error(`Cannot approve at status: ${currentStatus}`);

      await updateInit({
        stage_status: approval.nextStatus,
        [approval.field]: new Date().toISOString(),
      });
      await log("pipeline_stage_approved", `Stage aprovado: ${currentStatus} → ${approval.nextStatus}`);

      return new Response(JSON.stringify({ success: true, new_status: approval.nextStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== REJECT / SOLICITAR AJUSTES ==========
    if (stage === "reject") {
      if (!comment || comment.trim().length < 10) {
        return new Response(JSON.stringify({ error: "Comentário obrigatório (mínimo 10 caracteres) para solicitar ajustes." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentStatus = initiative.stage_status;

      // Rollback map: which status to go back to, and what stage label
      const rollbackMap: Record<string, { rollbackTo: string; stageLabel: string }> = {
        discovered: { rollbackTo: "draft", stageLabel: "discovery" },
        squad_formed: { rollbackTo: "squad_ready", stageLabel: "squad_formation" },
        planned: { rollbackTo: "planning_ready", stageLabel: "planning" },
        in_progress: { rollbackTo: "planned", stageLabel: "execution" },
        validating: { rollbackTo: "in_progress", stageLabel: "validation" },
        ready_to_publish: { rollbackTo: "validating", stageLabel: "publish" },
      };

      const rollback = rollbackMap[currentStatus];
      if (!rollback) {
        return new Response(JSON.stringify({ error: `Não é possível solicitar ajustes no status: ${currentStatus}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create rework job for traceability
      const jobId = await createJob("rework", {
        previous_status: currentStatus,
        rollback_to: rollback.rollbackTo,
        stage_affected: rollback.stageLabel,
        comment: comment.trim(),
      });

      // Rollback initiative status
      await updateInit({ stage_status: rollback.rollbackTo });

      // Mark related artifacts as needing revision (if execution was done)
      if (["in_progress", "validating"].includes(currentStatus)) {
        // Find stories for this initiative
        const { data: stories } = await serviceClient.from("stories")
          .select("id").eq("initiative_id", initiativeId);
        
        if (stories && stories.length > 0) {
          const storyIds = stories.map((s: any) => s.id);
          
          // Find subtask IDs through phases
          const { data: phases } = await serviceClient.from("story_phases")
            .select("id").in("story_id", storyIds);
          
          if (phases && phases.length > 0) {
            const phaseIds = phases.map((p: any) => p.id);
            
            const { data: subtasks } = await serviceClient.from("story_subtasks")
              .select("id").in("phase_id", phaseIds).eq("status", "completed");
            
            if (subtasks && subtasks.length > 0) {
              const subtaskIds = subtasks.map((st: any) => st.id);
              
              // Mark related agent_outputs as rejected (needs_revision)
              await serviceClient.from("agent_outputs")
                .update({ status: "rejected" })
                .in("subtask_id", subtaskIds)
                .eq("organization_id", initiative.organization_id);

              // Reset subtasks to pending for re-execution
              await serviceClient.from("story_subtasks")
                .update({ status: "pending", output: null, executed_at: null, executed_by_agent_id: null })
                .in("phase_id", phaseIds);

              // Reset phases to pending
              await serviceClient.from("story_phases")
                .update({ status: "pending" })
                .in("story_id", storyIds);

              // Reset stories to todo
              await serviceClient.from("stories")
                .update({ status: "todo" })
                .in("id", storyIds);
            }
          }
        }
      }

      if (jobId) {
        await serviceClient.from("initiative_jobs").update({
          status: "success",
          outputs: { action: "rework_requested", comment: comment.trim(), rollback_to: rollback.rollbackTo },
          completed_at: new Date().toISOString(),
        }).eq("id", jobId);
      }

      await log("pipeline_stage_rejected", `Ajustes solicitados em ${rollback.stageLabel}: ${comment.trim().slice(0, 200)}`, {
        previous_status: currentStatus,
        rollback_to: rollback.rollbackTo,
        comment: comment.trim(),
      });

      return new Response(JSON.stringify({
        success: true,
        action: "rework_requested",
        previous_status: currentStatus,
        new_status: rollback.rollbackTo,
        job_id: jobId,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== STAGE 4: EXECUTION (per-subtask jobs) ==========
    if (stage === "execution") {
      const masterJobId = await createJob("execution", { initiative_id: initiativeId });
      await updateInit({ stage_status: "in_progress" });
      await log("pipeline_execution_start", "Iniciando execução automática de subtasks...");

      try {
        const { data: stories } = await serviceClient.from("stories")
          .select("id, title, description")
          .eq("initiative_id", initiativeId)
          .in("status", ["todo", "in_progress"]);

        if (!stories || stories.length === 0) {
          throw new Error("Nenhuma story encontrada para execução");
        }

        const { data: squads } = await serviceClient.from("squads")
          .select("id, squad_members(agent_id, role_in_squad, agents(id, name, role, description, exclusive_authorities))")
          .eq("initiative_id", initiativeId);

        const squadMembers = squads?.[0]?.squad_members || [];
        if (squadMembers.length === 0) throw new Error("Nenhum agente no squad para executar");

        const agentsByRole: Record<string, any> = {};
        for (const sm of squadMembers) agentsByRole[sm.role_in_squad] = sm.agents;
        const defaultAgent = agentsByRole["dev"] || agentsByRole["architect"] || squadMembers[0]?.agents;

        let totalTokens = 0;
        let totalCost = 0;
        let executedCount = 0;
        let failedCount = 0;

        for (const story of stories) {
          await serviceClient.from("stories").update({ status: "in_progress" }).eq("id", story.id);

          const { data: phases } = await serviceClient.from("story_phases")
            .select("id, name, sort_order, story_subtasks(id, description, status, sort_order)")
            .eq("story_id", story.id)
            .order("sort_order");

          if (!phases) continue;

          for (const phase of phases) {
            await serviceClient.from("story_phases").update({ status: "in_progress" }).eq("id", phase.id);

            const subtasks = (phase.story_subtasks || [])
              .filter((st: any) => st.status === "pending")
              .sort((a: any, b: any) => a.sort_order - b.sort_order);

            for (const subtask of subtasks) {
              const assignedAgent = pickAgent(subtask.description, agentsByRole, defaultAgent);

              // Per-subtask job for granular traceability
              const subtaskJobId = await createJob("execution", {
                subtask_id: subtask.id,
                agent_id: assignedAgent.id,
                agent_name: assignedAgent.name,
                agent_role: assignedAgent.role,
                story_title: story.title,
                phase_name: phase.name,
                subtask_description: subtask.description,
              });

              await serviceClient.from("story_subtasks").update({
                status: "in_progress",
                executed_by_agent_id: assignedAgent.id,
              }).eq("id", subtask.id);

              try {
                const result = await callDeepSeek(
                  DEEPSEEK_API_KEY,
                  `Você é o agente "${assignedAgent.name}" com o papel de "${assignedAgent.role}" no AxionOS.
${assignedAgent.description || ""}
Sua tarefa é executar a subtask abaixo com maestria, produzindo um output técnico e completo.
Responda em português do Brasil.`,
                  `## Contexto
- **Story**: ${story.title}
- **Descrição**: ${story.description || ""}
- **Fase**: ${phase.name}

## Subtask a executar
${subtask.description}

Produza o output completo. Inclua detalhes técnicos, decisões e artefatos quando aplicável.`
                );

                await serviceClient.from("story_subtasks").update({
                  output: result.content,
                  status: "completed",
                  executed_at: new Date().toISOString(),
                }).eq("id", subtask.id);

                const outputType = assignedAgent.role === "architect" ? "decision"
                  : ["dev", "devops"].includes(assignedAgent.role) ? "code"
                  : ["analyst", "po", "pm"].includes(assignedAgent.role) ? "content"
                  : "analysis";

                const { data: artifact } = await serviceClient.from("agent_outputs").insert({
                  organization_id: initiative.organization_id,
                  workspace_id: initiative.workspace_id || null,
                  agent_id: assignedAgent.id,
                  subtask_id: subtask.id,
                  type: outputType,
                  status: "draft",
                  summary: subtask.description?.slice(0, 200),
                  raw_output: { text: result.content },
                  model_used: result.model,
                  prompt_used: subtask.description,
                  tokens_used: result.tokens,
                  cost_estimate: result.costUsd,
                }).select("id").single();

                if (subtaskJobId) await completeJob(subtaskJobId, {
                  artifact_id: artifact?.id,
                  tokens: result.tokens,
                }, result);

                totalTokens += result.tokens;
                totalCost += result.costUsd;
                executedCount++;
              } catch (subtaskErr) {
                await serviceClient.from("story_subtasks").update({ status: "failed" }).eq("id", subtask.id);
                if (subtaskJobId) await failJob(subtaskJobId, subtaskErr instanceof Error ? subtaskErr.message : "Unknown");
                failedCount++;
                console.error(`Subtask ${subtask.id} failed:`, subtaskErr);
              }
            }

            const { count: pendingCount } = await serviceClient.from("story_subtasks")
              .select("*", { count: "exact", head: true })
              .eq("phase_id", phase.id)
              .neq("status", "completed");
            if (pendingCount === 0) {
              await serviceClient.from("story_phases").update({ status: "completed" }).eq("id", phase.id);
            }
          }

          const { count: pendingPhases } = await serviceClient.from("story_phases")
            .select("*", { count: "exact", head: true })
            .eq("story_id", story.id)
            .neq("status", "completed");
          if (pendingPhases === 0) {
            await serviceClient.from("stories").update({ status: "done" }).eq("id", story.id);
          }
        }

        await updateInit({ stage_status: "validating" });
        if (masterJobId) await completeJob(masterJobId, {
          executed: executedCount, failed: failedCount, total_tokens: totalTokens,
        }, { model: "deepseek-chat", costUsd: totalCost, durationMs: 0 });

        await log("pipeline_execution_complete", `Execução concluída: ${executedCount} subtasks executadas, ${failedCount} falhas`, {
          total_tokens: totalTokens, cost_usd: totalCost,
        });

        return new Response(JSON.stringify({
          success: true, executed: executedCount, failed: failedCount,
          tokens: totalTokens, cost_usd: totalCost, job_id: masterJobId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (masterJobId) await failJob(masterJobId, e instanceof Error ? e.message : "Unknown error");
        throw e;
      }
    }

    // ========== STAGE 5: VALIDATION ==========
    if (stage === "validation") {
      const jobId = await createJob("validation", { initiative_id: initiativeId });
      await log("pipeline_validation_start", "Iniciando validação de qualidade dos artefatos...");

      try {
        // Fetch all artifacts for this initiative's subtasks
        const { data: stories } = await serviceClient.from("stories")
          .select("id").eq("initiative_id", initiativeId);
        
        if (!stories || stories.length === 0) throw new Error("Nenhuma story encontrada");

        const storyIds = stories.map((s: any) => s.id);
        const { data: phases } = await serviceClient.from("story_phases")
          .select("id").in("story_id", storyIds);
        
        const phaseIds = (phases || []).map((p: any) => p.id);
        const { data: subtasks } = await serviceClient.from("story_subtasks")
          .select("id").in("phase_id", phaseIds);
        
        const subtaskIds = (subtasks || []).map((st: any) => st.id);

        const { data: artifacts } = await serviceClient.from("agent_outputs")
          .select("id, type, summary, raw_output, agent_id, tokens_used, model_used, agents(name, role)")
          .in("subtask_id", subtaskIds)
          .eq("organization_id", initiative.organization_id);

        if (!artifacts || artifacts.length === 0) throw new Error("Nenhum artefato encontrado para validar");

        let totalTokens = 0;
        let totalCost = 0;
        let passCount = 0;
        let failCount = 0;
        const validationResults: any[] = [];

        for (const artifact of artifacts) {
          const artifactText = typeof artifact.raw_output === "object" 
            ? (artifact.raw_output as any)?.text || JSON.stringify(artifact.raw_output)
            : String(artifact.raw_output);

          const validationStart = Date.now();
          const result = await callDeepSeek(
            DEEPSEEK_API_KEY,
            `Você é um revisor de qualidade sênior do AxionOS. Analise o artefato produzido por um agente de IA e avalie sua qualidade.
Retorne APENAS JSON válido.`,
            `## Artefato para validação
- **Tipo**: ${artifact.type}
- **Agente**: ${(artifact as any).agents?.name || "?"} (${(artifact as any).agents?.role || "?"})
- **Resumo**: ${artifact.summary || "N/A"}

## Conteúdo do artefato (primeiros 4000 chars)
${artifactText.slice(0, 4000)}

## Avalie nos seguintes critérios (0-100 cada):
Retorne JSON:
{
  "scores": {
    "completeness": 0,
    "technical_quality": 0,
    "clarity": 0,
    "best_practices": 0,
    "actionability": 0
  },
  "overall_score": 0,
  "result": "pass|fail|warning",
  "issues": ["lista de problemas encontrados"],
  "suggestions": ["lista de melhorias sugeridas"],
  "summary": "resumo da avaliação em 1-2 frases"
}

Regras:
- overall_score >= 70 → "pass"
- overall_score 50-69 → "warning"  
- overall_score < 50 → "fail"`,
            true
          );

          let validation: any;
          try {
            validation = JSON.parse(result.content);
          } catch {
            validation = { overall_score: 50, result: "warning", summary: "Falha ao parsear validação", issues: [], suggestions: [], scores: {} };
          }

          const validationDuration = Date.now() - validationStart;

          // Create validation_run record
          await serviceClient.from("validation_runs").insert({
            artifact_id: artifact.id,
            type: "ai_quality_review",
            result: validation.result || "warning",
            logs: JSON.stringify({
              scores: validation.scores,
              overall_score: validation.overall_score,
              issues: validation.issues,
              suggestions: validation.suggestions,
              summary: validation.summary,
            }),
            duration: validationDuration,
          });

          if (validation.result === "pass") passCount++;
          else if (validation.result === "fail") failCount++;

          totalTokens += result.tokens;
          totalCost += result.costUsd;

          validationResults.push({
            artifact_id: artifact.id,
            type: artifact.type,
            agent: (artifact as any).agents?.name,
            score: validation.overall_score,
            result: validation.result,
            summary: validation.summary,
          });
        }

        const overallPass = failCount === 0;
        const nextStatus = overallPass ? "ready_to_publish" : "validating";

        await updateInit({ stage_status: nextStatus });

        if (jobId) await completeJob(jobId, {
          artifacts_validated: artifacts.length,
          passed: passCount,
          failed: failCount,
          warnings: artifacts.length - passCount - failCount,
          results: validationResults,
          overall_pass: overallPass,
        }, { model: "deepseek-chat", costUsd: totalCost, durationMs: 0 });

        await log("pipeline_validation_complete", 
          `Validação concluída: ${passCount} pass, ${failCount} fail de ${artifacts.length} artefatos`, {
          total_tokens: totalTokens, cost_usd: totalCost, overall_pass: overallPass,
        });

        return new Response(JSON.stringify({
          success: true,
          artifacts_validated: artifacts.length,
          passed: passCount, failed: failCount,
          overall_pass: overallPass,
          results: validationResults,
          tokens: totalTokens,
          cost_usd: totalCost,
          job_id: jobId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        throw e;
      }
    }

    // ========== STAGE 6: PUBLISH (create branch, commit artifacts, open PR) ==========
    if (stage === "publish") {
      if (!github_token || !owner || !repo) {
        return new Response(JSON.stringify({ error: "github_token, owner e repo são obrigatórios para publicar." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const jobId = await createJob("publish", { owner, repo, base_branch: base_branch || "main" });
      await log("pipeline_publish_start", "Iniciando publicação via GitHub...");

      const ghHeaders = {
        Authorization: `Bearer ${github_token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      };
      const GITHUB_API = "https://api.github.com";
      const branchName = `axion/initiative-${initiativeId.slice(0, 8)}-${Date.now()}`;
      const baseBranch = base_branch || "main";

      try {
        // 1. Get base branch SHA
        const refResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`, { headers: ghHeaders });
        if (!refResp.ok) {
          const t = await refResp.text();
          throw new Error(`Branch base '${baseBranch}' não encontrada: ${t}`);
        }
        const refData = await refResp.json();
        const baseSha = refData.object.sha;

        // 2. Create branch
        const createBranchResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
          method: "POST", headers: ghHeaders,
          body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
        });
        if (!createBranchResp.ok) {
          const err = await createBranchResp.json();
          throw new Error(`Falha ao criar branch: ${err.message}`);
        }

        // 3. Collect all artifacts
        const { data: stories } = await serviceClient.from("stories")
          .select("id, title").eq("initiative_id", initiativeId);
        const storyIds = (stories || []).map((s: any) => s.id);

        const { data: phases } = await serviceClient.from("story_phases")
          .select("id").in("story_id", storyIds);
        const phaseIds = (phases || []).map((p: any) => p.id);

        const { data: subtasks } = await serviceClient.from("story_subtasks")
          .select("id, description").in("phase_id", phaseIds);
        const subtaskIds = (subtasks || []).map((st: any) => st.id);

        const { data: artifacts } = await serviceClient.from("agent_outputs")
          .select("id, type, summary, raw_output, agents(name, role)")
          .in("subtask_id", subtaskIds)
          .eq("organization_id", initiative.organization_id);

        if (!artifacts || artifacts.length === 0) throw new Error("Nenhum artefato encontrado para publicar");

        // 4. Commit each artifact as a file
        const committedFiles: string[] = [];
        for (let i = 0; i < artifacts.length; i++) {
          const art = artifacts[i];
          const artText = typeof art.raw_output === "object"
            ? (art.raw_output as any)?.text || JSON.stringify(art.raw_output, null, 2)
            : String(art.raw_output);

          const safeTitle = (art.summary || `artifact-${i}`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
          const ext = art.type === "code" ? "ts" : "md";
          const filePath = `axion-outputs/${art.type}/${safeTitle}.${ext}`;

          const fileContent = art.type === "code" ? artText : `# ${art.summary || "Artifact"}\n\n**Agente**: ${(art as any).agents?.name || "?"} (${(art as any).agents?.role || "?"})\n**Tipo**: ${art.type}\n\n---\n\n${artText}`;

          const commitResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`, {
            method: "PUT", headers: ghHeaders,
            body: JSON.stringify({
              message: `[AxionOS] ${art.type}: ${art.summary?.slice(0, 60) || "artifact"}`,
              content: btoa(unescape(encodeURIComponent(fileContent))),
              branch: branchName,
            }),
          });
          if (commitResp.ok) {
            committedFiles.push(filePath);
          } else {
            console.error(`Failed to commit ${filePath}:`, await commitResp.text());
          }
        }

        if (committedFiles.length === 0) throw new Error("Nenhum arquivo foi commitado com sucesso");

        // 5. Open PR
        const prBody = `## 🚀 AxionOS — Delivery Automatizado

### Iniciativa: ${initiative.title}
${initiative.description || ""}

### Artefatos publicados (${committedFiles.length})
${committedFiles.map(f => `- \`${f}\``).join("\n")}

### Pipeline
- **Discovery**: ${initiative.approved_at_discovery ? "✅" : "⏳"}
- **Squad**: ${initiative.approved_at_squad ? "✅" : "⏳"}
- **Planning**: ${initiative.approved_at_planning ? "✅" : "⏳"}
- **Execução**: ✅
- **Validação**: ✅

---
*Gerado automaticamente pelo AxionOS Pipeline*`;

        const prResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
          method: "POST", headers: ghHeaders,
          body: JSON.stringify({
            title: `[AxionOS] ${initiative.title}`,
            head: branchName,
            base: baseBranch,
            body: prBody,
          }),
        });

        let prUrl = null;
        let prNumber = null;
        if (prResp.ok) {
          const prData = await prResp.json();
          prUrl = prData.html_url;
          prNumber = prData.number;
        }

        await updateInit({ stage_status: "published" });

        if (jobId) await completeJob(jobId, {
          branch: branchName,
          files_committed: committedFiles.length,
          pr_url: prUrl,
          pr_number: prNumber,
        }, { model: "github-api", costUsd: 0, durationMs: 0 });

        await log("pipeline_publish_complete", `Publicação concluída: ${committedFiles.length} arquivos, PR #${prNumber || "N/A"}`, {
          branch: branchName, pr_url: prUrl,
        });

        return new Response(JSON.stringify({
          success: true,
          branch: branchName,
          files_committed: committedFiles.length,
          pr_url: prUrl,
          pr_number: prNumber,
          job_id: jobId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        throw e;
      }
    }

    throw new Error(`Stage inválido: ${stage}. Use: discovery, squad_formation, planning, approve, reject, execution, validation, publish`);
  } catch (e) {
    console.error("run-initiative-pipeline error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
