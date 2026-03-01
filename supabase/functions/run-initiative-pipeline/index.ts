import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callDeepSeek(apiKey: string, systemPrompt: string, userPrompt: string, jsonMode = false) {
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
  return {
    content: data.choices?.[0]?.message?.content || "",
    tokens: data.usage?.total_tokens || 0,
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

    // ========== STAGE 1: DISCOVERY ==========
    if (stage === "discovery") {
      await updateInit({ status: "discovery" });
      await log("pipeline_discovery_start", "Iniciando descoberta inteligente...");

      const result = await callDeepSeek(
        DEEPSEEK_API_KEY,
        `Você é um consultor de produto e estratégia sênior. Analise a ideia do usuário e produza uma descoberta inteligente completa. Retorne APENAS JSON válido.`,
        `Ideia do usuário: "${initiative.title}"
${initiative.description ? `Descrição: ${initiative.description}` : ""}

Produza uma análise completa no seguinte formato JSON:
{
  "refined_idea": "Versão refinada e expandida da ideia original (2-3 parágrafos)",
  "business_model": "Modelo de negócio sugerido (SaaS, marketplace, freemium etc.) com justificativa",
  "mvp_scope": "Definição clara do MVP - o que entra e o que fica para depois",
  "complexity": "low|medium|high|critical",
  "risk_level": "low|medium|high|critical",
  "suggested_stack": "Stack tecnológica sugerida com justificativa técnica",
  "strategic_vision": "Visão estratégica do produto em 3 horizontes (3, 6, 12 meses)",
  "market_analysis": "Análise de mercado: concorrentes, diferenciação, público-alvo",
  "feasibility_analysis": "Análise de viabilidade técnica e de negócio",
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
        status: "discovery",
        refined_idea: discovery.refined_idea,
        business_model: discovery.business_model,
        mvp_scope: discovery.mvp_scope,
        complexity: discovery.complexity,
        risk_level: discovery.risk_level,
        suggested_stack: discovery.suggested_stack,
        strategic_vision: discovery.strategic_vision,
        market_analysis: discovery.market_analysis,
        feasibility_analysis: discovery.feasibility_analysis,
        initial_estimate: discovery.initial_estimate,
      });

      await log("pipeline_discovery_complete", "Descoberta inteligente concluída", { tokens: result.tokens, complexity: discovery.complexity });

      return new Response(JSON.stringify({ success: true, discovery, tokens: result.tokens }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== STAGE 2: SQUAD FORMATION ==========
    if (stage === "squad_formation") {
      await updateInit({ status: "squad_formation" });
      await log("pipeline_squad_start", "Formando squad de agentes...");

      const context = `Projeto: ${initiative.title}
Ideia refinada: ${initiative.refined_idea || initiative.description || ""}
Complexidade: ${initiative.complexity}
Stack sugerida: ${initiative.suggested_stack || "A definir"}
MVP: ${initiative.mvp_scope || "A definir"}`;

      const result = await callDeepSeek(
        DEEPSEEK_API_KEY,
        "Você é um especialista em montagem de equipes de IA para desenvolvimento de software. Monte o squad ideal baseado no tipo e complexidade do projeto. Retorne APENAS JSON válido.",
        `${context}

Monte um squad de agentes IA otimizado para este projeto.
Papéis disponíveis: analyst, pm, architect, sm, dev, qa, devops, ux_expert, po
Para projetos simples: 3-4 agentes. Médios: 5-6. Complexos: 6-8.

JSON: {"agents": [{"name": "string", "role": "string", "description": "string", "justification": "string"}], "squad_strategy": "string explicando a estratégia de composição"}`,
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
          user_id: user.id,
          name: ag.name,
          role: ag.role,
          description: `${ag.description}\n\nJustificativa: ${ag.justification}`,
          organization_id: initiative.organization_id,
          workspace_id: initiative.workspace_id,
          status: "active",
        }).select("id, name, role").single();

        if (agentData && squad) {
          await serviceClient.from("squad_members").insert({
            squad_id: squad.id, agent_id: agentData.id, role_in_squad: ag.role,
          });
          createdAgents.push(agentData);
        }
      }

      await log("pipeline_squad_complete", `Squad formado: ${createdAgents.length} agentes`, {
        tokens: result.tokens, agents: createdAgents.map(a => a.role), strategy: squad_strategy,
      });

      return new Response(JSON.stringify({
        success: true, squad_id: squad?.id, agents: createdAgents,
        strategy: squad_strategy, tokens: result.tokens,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== STAGE 3: PLANNING (Formalização Técnica) ==========
    if (stage === "planning") {
      await updateInit({ status: "planning" });
      await log("pipeline_planning_start", "Iniciando formalização técnica...");

      const context = `Projeto: ${initiative.title}
Ideia refinada: ${initiative.refined_idea || initiative.description || ""}
Modelo de Negócio: ${initiative.business_model || "N/A"}
MVP: ${initiative.mvp_scope || "N/A"}
Stack: ${initiative.suggested_stack || "N/A"}
Visão Estratégica: ${initiative.strategic_vision || "N/A"}`;

      // 3A: PRD
      const prdResult = await callDeepSeek(
        DEEPSEEK_API_KEY,
        "Você é um Product Manager sênior. Crie um PRD detalhado e executável em português brasileiro usando markdown. Este não é um documento de ideação — é o blueprint de execução.",
        `${context}\n\nCrie um PRD completo e técnico incluindo:\n## Visão Geral\n## Problema a Resolver\n## Personas e Casos de Uso\n## Requisitos Funcionais (detalhados)\n## Requisitos Não-Funcionais\n## Critérios de Aceite\n## Dependências Técnicas\n## Métricas de Sucesso\n## Riscos e Mitigações`
      );
      await updateInit({ prd_content: prdResult.content });

      // 3B: Architecture
      await updateInit({ status: "architecting" });
      const archResult = await callDeepSeek(
        DEEPSEEK_API_KEY,
        "Você é um Arquiteto de Software sênior. Crie um documento de arquitetura técnica executável baseado no PRD. Use markdown.",
        `PRD:\n${prdResult.content.slice(0, 6000)}\n\nStack sugerida: ${initiative.suggested_stack || "A definir"}\n\nCrie a arquitetura incluindo:\n## Stack Tecnológica Final\n## Arquitetura do Sistema (diagrama textual)\n## Componentes Principais\n## Modelo de Dados (entidades e relacionamentos)\n## APIs e Contratos\n## Fluxos de Dados\n## Segurança\n## Escalabilidade\n## Plano de Deploy`
      );
      await updateInit({ architecture_content: archResult.content });

      // 3C: Stories
      await updateInit({ status: "ready" });
      const storiesResult = await callDeepSeek(
        DEEPSEEK_API_KEY,
        "Você é um Product Manager sênior. Gere user stories executáveis. Retorne APENAS JSON válido.",
        `Projeto: ${initiative.title}\n\nPRD:\n${prdResult.content.slice(0, 4000)}\n\nArquitetura:\n${archResult.content.slice(0, 4000)}\n\nGere 3-8 user stories executáveis com fases e subtasks granulares.\nJSON: {"stories": [{"title": "string", "description": "string", "priority": "low|medium|high|critical", "phases": [{"name": "string", "subtasks": ["string"]}]}]}`,
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

      await updateInit({ status: "in_progress" });
      const totalTokens = prdResult.tokens + archResult.tokens + storiesResult.tokens;
      await log("pipeline_planning_complete", `Planning completo: PRD + Arquitetura + ${createdStories.length} stories`, { totalTokens });

      return new Response(JSON.stringify({
        success: true, stories: createdStories, tokens: totalTokens,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Stage inválido: ${stage}. Use: discovery, squad_formation, planning`);
  } catch (e) {
    console.error("run-initiative-pipeline error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
