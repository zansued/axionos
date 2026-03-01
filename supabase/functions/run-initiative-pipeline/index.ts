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
  // Rough cost estimate for deepseek-chat
  const costUsd = tokens * 0.00000014;
  return {
    content: data.choices?.[0]?.message?.content || "",
    tokens,
    durationMs,
    costUsd,
    model: "deepseek-chat",
  };
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

    const { initiativeId, stage } = await req.json();
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

    // Create a job record for traceability
    const createJob = async (jobStage: string, inputs: any) => {
      const { data } = await serviceClient.from("initiative_jobs").insert({
        initiative_id: initiativeId,
        stage: jobStage,
        status: "running",
        inputs,
        user_id: user.id,
      }).select("id").single();
      return data?.id;
    };

    const completeJob = async (jobId: string, outputs: any, result: any) => {
      await serviceClient.from("initiative_jobs").update({
        status: "success",
        outputs,
        model: result.model,
        cost_usd: result.costUsd,
        duration_ms: result.durationMs,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    };

    const failJob = async (jobId: string, error: string) => {
      await serviceClient.from("initiative_jobs").update({
        status: "failed",
        error,
        completed_at: new Date().toISOString(),
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

        // Store main fields + full payload in discovery_payload
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

        // 3A: PRD
        const prdResult = await callDeepSeek(
          DEEPSEEK_API_KEY,
          "Você é um Product Manager sênior. Crie um PRD detalhado e executável em português brasileiro usando markdown.",
          `${context}\n\nCrie um PRD completo incluindo:\n## Visão Geral\n## Problema a Resolver\n## Personas e Casos de Uso\n## Requisitos Funcionais\n## Requisitos Não-Funcionais\n## Critérios de Aceite\n## Dependências Técnicas\n## Métricas de Sucesso\n## Riscos e Mitigações`
        );
        await updateInit({ prd_content: prdResult.content });

        // 3B: Architecture
        const archResult = await callDeepSeek(
          DEEPSEEK_API_KEY,
          "Você é um Arquiteto de Software sênior. Crie um documento de arquitetura técnica baseado no PRD. Use markdown.",
          `PRD:\n${prdResult.content.slice(0, 6000)}\n\nStack sugerida: ${dp.suggested_stack || "A definir"}\n\nCrie a arquitetura incluindo:\n## Stack Tecnológica Final\n## Arquitetura do Sistema\n## Componentes Principais\n## Modelo de Dados\n## APIs e Contratos\n## Segurança\n## Escalabilidade\n## Plano de Deploy`
        );
        await updateInit({ architecture_content: archResult.content });

        // 3C: Stories
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
      const { approve_stage } = await req.json().catch(() => ({}));
      const currentStatus = initiative.stage_status;

      const approvalMap: Record<string, { field: string; nextStatus: string }> = {
        discovered: { field: "approved_at_discovery", nextStatus: "squad_ready" },
        squad_formed: { field: "approved_at_squad", nextStatus: "planning_ready" },
        planned: { field: "approved_at_planning", nextStatus: "in_progress" },
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

    throw new Error(`Stage inválido: ${stage}. Use: discovery, squad_formation, planning, approve`);
  } catch (e) {
    console.error("run-initiative-pipeline error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
