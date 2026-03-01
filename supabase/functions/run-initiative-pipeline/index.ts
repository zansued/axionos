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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

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

    const { initiativeId } = await req.json();
    if (!initiativeId) throw new Error("initiativeId is required");

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    // Fetch initiative
    const { data: initiative, error: initErr } = await serviceClient
      .from("initiatives").select("*").eq("id", initiativeId).single();
    if (initErr || !initiative) throw new Error("Initiative not found");

    const log = async (action: string, message: string, meta: any = {}) => {
      await serviceClient.from("audit_logs").insert({
        user_id: user.id,
        action,
        category: "pipeline",
        entity_type: "initiatives",
        entity_id: initiativeId,
        message,
        severity: "info",
        organization_id: initiative.organization_id,
        metadata: meta,
      });
    };

    const updateStatus = async (status: string) => {
      await serviceClient.from("initiatives").update({ status }).eq("id", initiativeId);
    };

    const steps: any = { squad: null, prd: null, architecture: null, stories: [] };

    // === STEP 1: Generate Squad ===
    await updateStatus("planning");
    await log("pipeline_step", "Gerando squad de agentes...");

    const squadResult = await callDeepSeek(
      DEEPSEEK_API_KEY,
      "Você é um especialista em montagem de equipes de IA. Retorne APENAS JSON válido.",
      `Projeto: ${initiative.title}\nDescrição: ${initiative.description || "Sem descrição"}\n\nGere um time de 4-6 agentes IA otimizado. Papéis: analyst, pm, architect, sm, dev, qa, devops, ux_expert.\n\nJSON: {"agents": [{"name": "string", "role": "string", "description": "string"}]}`,
      true
    );
    const { agents } = JSON.parse(squadResult.content);

    // Create squad
    const { data: squad } = await serviceClient.from("squads").insert({
      initiative_id: initiativeId,
      name: `Squad ${initiative.title.slice(0, 30)}`,
      auto_generated: true,
      organization_id: initiative.organization_id,
    }).select().single();

    // Create agents and squad members
    for (const ag of agents) {
      const { data: agentData } = await serviceClient.from("agents").insert({
        user_id: user.id,
        name: ag.name,
        role: ag.role,
        description: ag.description,
        organization_id: initiative.organization_id,
        workspace_id: initiative.workspace_id,
        status: "active",
      }).select("id").single();

      if (agentData && squad) {
        await serviceClient.from("squad_members").insert({
          squad_id: squad.id,
          agent_id: agentData.id,
          role_in_squad: ag.role,
        });
      }
    }
    steps.squad = { id: squad?.id, agentCount: agents.length };
    await log("pipeline_step", `Squad criado com ${agents.length} agentes`, { agents: agents.map((a: any) => a.role) });

    // === STEP 2: Generate PRD ===
    await log("pipeline_step", "Gerando PRD...");
    const prdResult = await callDeepSeek(
      DEEPSEEK_API_KEY,
      "Você é um Analista de Produto sênior. Crie um PRD detalhado em português brasileiro usando markdown.",
      `Crie um PRD completo para: "${initiative.title}"\n${initiative.description ? `Descrição: ${initiative.description}` : ""}\n\nInclua: Visão Geral, Problema, Personas, Requisitos Funcionais, Requisitos Não-Funcionais, Critérios de Aceite, Métricas de Sucesso, Riscos.`
    );
    await serviceClient.from("initiatives").update({ prd_content: prdResult.content }).eq("id", initiativeId);
    steps.prd = { tokens: prdResult.tokens };
    await log("pipeline_step", "PRD gerado com sucesso", { tokens: prdResult.tokens });

    // === STEP 3: Generate Architecture ===
    await updateStatus("architecting");
    await log("pipeline_step", "Gerando arquitetura...");
    const archResult = await callDeepSeek(
      DEEPSEEK_API_KEY,
      "Você é um Arquiteto de Software sênior. Crie um documento de arquitetura técnica em português brasileiro usando markdown.",
      `Com base no PRD abaixo, crie a arquitetura técnica:\n\nPRD:\n${prdResult.content.slice(0, 6000)}\n\nInclua: Stack Tecnológica, Arquitetura do Sistema, Componentes, Modelo de Dados, APIs, Segurança, Escalabilidade, Plano de Deploy.`
    );
    await serviceClient.from("initiatives").update({ architecture_content: archResult.content }).eq("id", initiativeId);
    steps.architecture = { tokens: archResult.tokens };
    await log("pipeline_step", "Arquitetura gerada com sucesso", { tokens: archResult.tokens });

    // === STEP 4: Generate Stories ===
    await updateStatus("ready");
    await log("pipeline_step", "Gerando stories...");
    const storiesResult = await callDeepSeek(
      DEEPSEEK_API_KEY,
      "Você é um Product Manager sênior. Gere user stories bem definidas. Retorne APENAS JSON válido.",
      `Projeto: ${initiative.title}\n\nPRD:\n${prdResult.content.slice(0, 4000)}\n\nArquitetura:\n${archResult.content.slice(0, 4000)}\n\nGere 3-8 user stories cobrindo os principais requisitos.\nJSON: {"stories": [{"title": "string", "description": "string", "priority": "low|medium|high|critical", "phases": [{"name": "string", "subtasks": ["string"]}]}]}`,
      true
    );
    const { stories } = JSON.parse(storiesResult.content);

    for (const story of stories) {
      const { data: storyData, error: storyErr } = await serviceClient
        .from("stories")
        .insert({
          user_id: user.id,
          title: story.title,
          description: story.description,
          priority: story.priority || "medium",
          status: "todo",
          organization_id: initiative.organization_id,
          workspace_id: initiative.workspace_id,
          initiative_id: initiativeId,
        })
        .select("id")
        .single();

      if (storyErr || !storyData) {
        console.error("Story insert error:", storyErr);
        continue;
      }

      for (let pi = 0; pi < (story.phases || []).length; pi++) {
        const phase = story.phases[pi];
        const { data: phaseData } = await serviceClient.from("story_phases").insert({
          story_id: storyData.id,
          name: phase.name,
          sort_order: pi,
        }).select("id").single();

        if (phaseData) {
          for (let si = 0; si < (phase.subtasks || []).length; si++) {
            await serviceClient.from("story_subtasks").insert({
              phase_id: phaseData.id,
              description: phase.subtasks[si],
              sort_order: si,
            });
          }
        }
      }
      steps.stories.push({ id: storyData.id, title: story.title });
    }

    await updateStatus("in_progress");
    await log("pipeline_complete", `Pipeline completo: ${agents.length} agentes, ${steps.stories.length} stories`, {
      totalTokens: squadResult.tokens + prdResult.tokens + archResult.tokens + storiesResult.tokens,
    });

    return new Response(JSON.stringify({ success: true, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-initiative-pipeline error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
