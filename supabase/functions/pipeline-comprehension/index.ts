// Layer 1 — Problem Comprehension
// Orchestrates: Vision Agent → Market Analyst → Requirements Agent → Product Architect
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, upsertNode, addEdge, recordDecision } from "../_shared/brain-helpers.ts";

interface AgentOutput {
  role: string;
  model: string;
  tokens: number;
  costUsd: number;
  durationMs: number;
  result: Record<string, unknown>;
}

async function runAgent(
  apiKey: string,
  role: string,
  systemPrompt: string,
  userPrompt: string,
  usePro = false,
): Promise<AgentOutput> {
  const aiResult = await callAI(apiKey, systemPrompt, userPrompt, true, 3, usePro);
  const result = JSON.parse(aiResult.content);
  return { role, model: aiResult.model, tokens: aiResult.tokens, costUsd: aiResult.costUsd, durationMs: aiResult.durationMs, result };
}

// Scrape reference URL via Firecrawl if available
async function scrapeReference(url: string): Promise<string> {
  const selfHostedUrl = Deno.env.get("FIRECRAWL_SELF_HOSTED_URL");
  const selfHostedKey = Deno.env.get("FIRECRAWL_SELF_HOSTED_KEY");
  const cloudKey = Deno.env.get("FIRECRAWL_API_KEY");
  const baseUrl = selfHostedUrl || "https://api.firecrawl.dev";
  const apiKey = selfHostedUrl ? selfHostedKey : cloudKey;
  if (!apiKey) return "";

  try {
    const resp = await fetch(`${baseUrl}/v1/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    return (data?.data?.markdown || data?.markdown || "").slice(0, 8000);
  } catch { return ""; }
}

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-comprehension");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const jobId = await createJob(ctx, "comprehension", {
    title: initiative.title,
    description: initiative.description,
    reference_url: initiative.reference_url,
  });
  await updateInitiative(ctx, { stage_status: "discovering" });
  await pipelineLog(ctx, "pipeline_comprehension_start", "Camada 1 — Compreensão do Problema iniciada (4 agentes)");

  try {
    // Brain context (empty for first run, useful for re-runs)
    const brainContext = await generateBrainContext(ctx);

    // Scrape reference
    let referenceContent = "";
    if (initiative.reference_url) {
      referenceContent = await scrapeReference(initiative.reference_url);
    }
    const refBlock = referenceContent
      ? `\n\nSITE DE REFERÊNCIA (${initiative.reference_url}):\n---\n${referenceContent}\n---`
      : "";

    const brainBlock = brainContext ? `\n\n${brainContext}` : "";
    const ideaContext = `Título: "${initiative.title}"\n${initiative.description ? `Descrição: ${initiative.description}` : ""}${refBlock}${brainBlock}`;

    // ──── Agent 1: Vision Agent ────
    await pipelineLog(ctx, "agent_vision_start", "🔭 Vision Agent analisando a ideia...");
    const vision = await runAgent(
      apiKey,
      "vision_agent",
      `Você é o Vision Agent — especialista em interpretação de ideias de produto. Sua função é extrair o problema real, tipo de produto e perfil do usuário. Retorne APENAS JSON válido.`,
      `${ideaContext}

Analise esta ideia e retorne:
{
  "problem_statement": "Qual dor real o software resolve (2-3 frases)",
  "product_type": "Tipo de produto (SaaS, marketplace, ferramenta interna, mobile app, etc.)",
  "target_user_profile": {
    "primary_persona": "Descrição do usuário principal",
    "secondary_personas": ["outros perfis de usuário"],
    "pain_points": ["dores específicas do usuário"],
    "goals": ["objetivos do usuário"]
  },
  "value_proposition": "Qual valor único este software gera",
  "product_category": "Categoria do produto",
  "key_differentiators": ["diferenciais competitivos identificados"]
}`,
    );

    // Store Vision Agent output
    await serviceClient.from("agent_outputs").insert({
      organization_id: ctx.organizationId,
      initiative_id: ctx.initiativeId,
      type: "analysis",
      status: "approved",
      summary: `Vision Agent: ${vision.result.problem_statement || ""}`.slice(0, 200),
      raw_output: { agent: "vision_agent", layer: 1, ...vision.result },
      model_used: vision.model,
      tokens_used: vision.tokens,
      cost_estimate: vision.costUsd,
    });

    // ──── Agent 2: Market Analyst Agent ────
    await pipelineLog(ctx, "agent_market_start", "📊 Market Analyst avaliando viabilidade...");
    const market = await runAgent(
      apiKey,
      "market_analyst",
      `Você é o Market Analyst Agent — analista de mercado e viabilidade. Use a análise de visão anterior como contexto. Retorne APENAS JSON válido.`,
      `${ideaContext}

ANÁLISE DE VISÃO (do agente anterior):
${JSON.stringify(vision.result, null, 2)}

Produza uma análise de mercado completa:
{
  "market_size": "Tamanho estimado do mercado",
  "competitors": [{"name": "string", "strengths": ["string"], "weaknesses": ["string"]}],
  "business_model": {
    "type": "SaaS|freemium|marketplace|one-time|subscription|hybrid",
    "revenue_streams": ["fontes de receita"],
    "pricing_strategy": "Estratégia de precificação sugerida"
  },
  "feasibility": {
    "technical": "low|medium|high",
    "market": "low|medium|high",
    "financial": "low|medium|high",
    "overall": "low|medium|high",
    "risks": ["riscos identificados"],
    "mitigations": ["mitigações sugeridas"]
  },
  "go_to_market": "Estratégia de entrada no mercado",
  "market_timing": "Avaliação do timing de mercado"
}`,
    );

    await serviceClient.from("agent_outputs").insert({
      organization_id: ctx.organizationId,
      initiative_id: ctx.initiativeId,
      type: "analysis",
      status: "approved",
      summary: `Market Analyst: ${market.result.market_size || ""}`.slice(0, 200),
      raw_output: { agent: "market_analyst", layer: 1, ...market.result },
      model_used: market.model,
      tokens_used: market.tokens,
      cost_estimate: market.costUsd,
    });

    // ──── Agent 3: Requirements Agent ────
    await pipelineLog(ctx, "agent_requirements_start", "📋 Requirements Agent extraindo requisitos...");
    const requirements = await runAgent(
      apiKey,
      "requirements_agent",
      `Você é o Requirements Agent — especialista em engenharia de requisitos. Transforme a ideia em requisitos claros e rastreáveis usando as análises anteriores como contexto. Retorne APENAS JSON válido.`,
      `${ideaContext}

VISÃO: ${JSON.stringify(vision.result, null, 2)}
MERCADO: ${JSON.stringify(market.result, null, 2)}

Extraia requisitos estruturados:
{
  "functional_requirements": [
    {"id": "FR-001", "title": "string", "description": "string", "priority": "must|should|could|wont", "module": "string"}
  ],
  "non_functional_requirements": [
    {"id": "NFR-001", "category": "performance|security|usability|reliability|scalability", "description": "string", "metric": "string"}
  ],
  "user_flows": [
    {"name": "string", "steps": ["string"], "actor": "string"}
  ],
  "entities": [
    {"name": "string", "attributes": ["string"], "relationships": ["string"]}
  ],
  "permissions": {
    "roles": ["string"],
    "access_matrix": [{"role": "string", "resources": ["string"], "actions": ["string"]}]
  },
  "constraints": ["restrições técnicas ou de negócio"],
  "assumptions": ["premissas assumidas"]
}`,
      true, // usePro for better quality on requirements
    );

    await serviceClient.from("agent_outputs").insert({
      organization_id: ctx.organizationId,
      initiative_id: ctx.initiativeId,
      type: "analysis",
      status: "approved",
      summary: `Requirements: ${(requirements.result.functional_requirements as any[])?.length || 0} FRs, ${(requirements.result.non_functional_requirements as any[])?.length || 0} NFRs`,
      raw_output: { agent: "requirements_agent", layer: 1, ...requirements.result },
      model_used: requirements.model,
      tokens_used: requirements.tokens,
      cost_estimate: requirements.costUsd,
    });

    // ──── Agent 4: Product Architect Agent ────
    await pipelineLog(ctx, "agent_product_architect_start", "🏗️ Product Architect definindo PRD e features...");
    const productArch = await runAgent(
      apiKey,
      "product_architect",
      `Você é o Product Architect Agent — responsável por definir a arquitetura de produto (PRD, módulos, fluxos, restrições). Use TODAS as análises anteriores. Retorne APENAS JSON válido.`,
      `${ideaContext}

VISÃO: ${JSON.stringify(vision.result, null, 2)}
MERCADO: ${JSON.stringify(market.result, null, 2)}
REQUISITOS: ${JSON.stringify(requirements.result, null, 2)}

Crie o PRD e arquitetura de produto:
{
  "prd": {
    "executive_summary": "Resumo executivo do produto (2-3 parágrafos)",
    "problem_definition": "Definição clara do problema",
    "solution_overview": "Visão geral da solução",
    "success_metrics": ["métricas de sucesso mensuráveis"],
    "scope": {
      "in_scope": ["o que está incluído no MVP"],
      "out_of_scope": ["o que fica para versões futuras"]
    }
  },
  "system_features": [
    {
      "id": "SF-001",
      "name": "string",
      "description": "string",
      "priority": "P0|P1|P2|P3",
      "sub_features": ["string"],
      "dependencies": ["SF-xxx"]
    }
  ],
  "modules": [
    {"name": "string", "responsibility": "string", "features": ["SF-xxx"]}
  ],
  "technical_constraints": ["restrições técnicas identificadas"],
  "mvp_definition": {
    "features": ["features incluídas no MVP"],
    "estimated_effort_weeks": 0,
    "team_size_recommendation": 0
  },
  "complexity": "low|medium|high|critical",
  "risk_level": "low|medium|high|critical",
  "suggested_stack": "Stack tecnológica sugerida com justificativa"
}`,
      true,
    );

    await serviceClient.from("agent_outputs").insert({
      organization_id: ctx.organizationId,
      initiative_id: ctx.initiativeId,
      type: "analysis",
      status: "approved",
      summary: `Product Architect: ${(productArch.result.system_features as any[])?.length || 0} features, ${(productArch.result.modules as any[])?.length || 0} módulos`,
      raw_output: { agent: "product_architect", layer: 1, ...productArch.result },
      model_used: productArch.model,
      tokens_used: productArch.tokens,
      cost_estimate: productArch.costUsd,
    });

    // ──── Write to Project Brain ────
    try {
      // Record domain entities as nodes
      const entities = (requirements.result.entities as any[]) || [];
      for (const entity of entities.slice(0, 20)) {
        await upsertNode(ctx, { node_type: "type", name: entity.name, metadata: { attributes: entity.attributes, relationships: entity.relationships, source: "comprehension" }, status: "planned" });
      }
      // Record key decisions
      if (productArch.result.suggested_stack) {
        await recordDecision(ctx, `Stack: ${productArch.result.suggested_stack}`, (productArch.result as any).justification || "Recomendação do Product Architect", "high", "architecture");
      }
      if (market.result.business_model) {
        await recordDecision(ctx, `Business Model: ${(market.result.business_model as any)?.type || ""}`, "Análise do Market Analyst", "medium", "business");
      }
      // Record modules as nodes
      const modules = (productArch.result.modules as any[]) || [];
      for (const mod of modules.slice(0, 15)) {
        await upsertNode(ctx, { node_type: "component", name: mod.name, metadata: { responsibility: mod.responsibility, features: mod.features, source: "comprehension" }, status: "planned" });
      }
    } catch (e) { console.error("Brain write error (comprehension):", e); }

    // ──── Consolidate results ────
    const totalTokens = vision.tokens + market.tokens + requirements.tokens + productArch.tokens;
    const totalCost = vision.costUsd + market.costUsd + requirements.costUsd + productArch.costUsd;

    const prd = productArch.result.prd as Record<string, unknown> || {};
    const mvpDef = productArch.result.mvp_definition as Record<string, unknown> || {};

    await updateInitiative(ctx, {
      stage_status: "discovered",
      idea_raw: initiative.description || initiative.title,
      refined_idea: (vision.result.problem_statement as string || "").slice(0, 500),
      business_model: JSON.stringify(market.result.business_model || {}).slice(0, 300),
      mvp_scope: JSON.stringify(mvpDef).slice(0, 300),
      complexity: (productArch.result.complexity as string) || "medium",
      risk_level: (productArch.result.risk_level as string) || "medium",
      target_user: (vision.result.target_user_profile as any)?.primary_persona?.slice(0, 200) || "",
      suggested_stack: (productArch.result.suggested_stack as string)?.slice(0, 200) || "",
      market_analysis: (market.result.go_to_market as string)?.slice(0, 500) || "",
      feasibility_analysis: JSON.stringify(market.result.feasibility || {}).slice(0, 500),
      strategic_vision: (prd.executive_summary as string)?.slice(0, 500) || "",
      prd_content: (prd.executive_summary as string || "") + "\n\n" + (prd.solution_overview as string || ""),
      discovery_payload: {
        vision: vision.result,
        market: market.result,
        requirements: requirements.result,
        product_architecture: productArch.result,
        agents_used: ["vision_agent", "market_analyst", "requirements_agent", "product_architect"],
        reference_url: initiative.reference_url,
        reference_scraped: !!referenceContent,
        total_tokens: totalTokens,
        total_cost_usd: totalCost,
      },
    });

    // Create squad with Layer 1 agents
    const { data: oldSquads } = await serviceClient.from("squads").select("id").eq("initiative_id", ctx.initiativeId);
    if (oldSquads?.length) {
      for (const sq of oldSquads) await serviceClient.from("squad_members").delete().eq("squad_id", sq.id);
      await serviceClient.from("squads").delete().eq("initiative_id", ctx.initiativeId);
    }

    const { data: squad } = await serviceClient.from("squads").insert({
      initiative_id: ctx.initiativeId,
      name: `Layer 1 — Compreensão`,
      auto_generated: true,
      organization_id: ctx.organizationId,
    }).select().single();

    if (squad) {
      const layer1Roles = [
        { name: "Vision Agent", role: "vision_agent", desc: "Interpreta a ideia e identifica problema, tipo de produto e perfil de usuário" },
        { name: "Market Analyst", role: "market_analyst", desc: "Analisa viabilidade, competidores e modelo de negócio" },
        { name: "Requirements Agent", role: "requirements_agent", desc: "Transforma ideia em requisitos funcionais e não-funcionais" },
        { name: "Product Architect", role: "product_architect", desc: "Define PRD, features de sistema e módulos" },
      ];

      for (const ag of layer1Roles) {
        const { data: agent } = await serviceClient.from("agents").insert({
          user_id: user.id, name: ag.name, role: ag.role as any,
          description: ag.desc, organization_id: ctx.organizationId,
          workspace_id: initiative.workspace_id, status: "active",
        }).select("id").single();
        if (agent) {
          await serviceClient.from("squad_members").insert({ squad_id: squad.id, agent_id: agent.id, role_in_squad: ag.role });
        }
      }
    }

    if (jobId) await completeJob(ctx, jobId, {
      vision: vision.result,
      market: market.result,
      requirements: requirements.result,
      product_architecture: productArch.result,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
    }, { model: productArch.model, costUsd: totalCost, durationMs: vision.durationMs + market.durationMs + requirements.durationMs + productArch.durationMs });

    await pipelineLog(ctx, "pipeline_comprehension_complete",
      `Camada 1 concluída: 4 agentes, ${totalTokens} tokens, $${totalCost.toFixed(4)}`,
      { tokens: totalTokens, cost_usd: totalCost }
    );

    return jsonResponse({
      success: true,
      agents_executed: 4,
      layers_completed: [1],
      vision: vision.result,
      market: market.result,
      requirements: requirements.result,
      product_architecture: productArch.result,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
      job_id: jobId,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "draft" });
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
