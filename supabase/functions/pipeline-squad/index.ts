import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-squad");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const dp = initiative.discovery_payload || {};
  const jobId = await createJob(ctx, "squad_formation", { complexity: initiative.complexity, refined_idea: initiative.refined_idea });
  await updateInitiative(ctx, { stage_status: "forming_squad" });
  await pipelineLog(ctx, "pipeline_squad_start", "Formando squad de agentes...");

  try {
    // Cleanup old squads
    const { data: oldSquads } = await serviceClient.from("squads").select("id").eq("initiative_id", ctx.initiativeId);
    if (oldSquads && oldSquads.length > 0) {
      for (const sq of oldSquads) {
        await serviceClient.from("squad_members").delete().eq("squad_id", sq.id);
      }
      await serviceClient.from("squads").delete().eq("initiative_id", ctx.initiativeId);
      console.log(`Cleaned up ${oldSquads.length} old squad(s) for re-run`);
    }

    const context = `Projeto: ${initiative.title}
Ideia refinada: ${dp.refined_idea || initiative.refined_idea || initiative.description || ""}
Complexidade: ${initiative.complexity}
Stack sugerida: ${dp.suggested_stack || "A definir"}
MVP: ${dp.mvp_scope || initiative.mvp_scope || "A definir"}`;

    const aiResult = await callAI(
      apiKey,
      `Você é um especialista em montagem de equipes de IA para desenvolvimento de software. Monte o squad ideal com papéis DIVERSIFICADOS.

REGRA CRÍTICA: O campo "role" de cada agente DEVE ser EXATAMENTE um destes valores (copie literalmente):
- "analyst" (analista de requisitos/negócios)
- "pm" (product manager)
- "architect" (arquiteto de software)
- "sm" (scrum master)
- "po" (product owner)  
- "dev" (desenvolvedor)
- "qa" (quality assurance / tester)
- "devops" (infraestrutura / deploy)
- "ux_expert" (designer UX/UI)

NÃO invente roles. NÃO use "developer", "frontend", "backend", "engineer", "designer". Use APENAS os valores exatos acima.
Um squad bem formado TEM papéis diferentes (architect, dev, qa, pm, etc). NÃO coloque todos como "dev".
Retorne APENAS JSON válido.`,
      `${context}

Monte um squad DIVERSIFICADO com papéis complementares. Todo squad PRECISA ter no mínimo: 1 architect, 1 dev, 1 qa.
Para projetos simples: 3-4 agentes. Médios: 5-6. Complexos: 6-8.

IMPORTANTE: use os roles EXATOS: analyst, pm, architect, sm, po, dev, qa, devops, ux_expert.

JSON: {"agents": [{"name": "string (nome humano)", "role": "string (EXATO do enum)", "description": "string", "justification": "string"}], "squad_strategy": "string"}`,
      true
    );

    const parsed = JSON.parse(aiResult.content);
    const agents = parsed.agents || [];
    const squad_strategy = parsed.squad_strategy || "";

    if (!Array.isArray(agents) || agents.length === 0) {
      throw new Error("A IA não retornou agentes válidos. Tente novamente.");
    }

    const { data: squad } = await serviceClient.from("squads").insert({
      initiative_id: ctx.initiativeId,
      name: `Squad ${initiative.title.slice(0, 30)}`,
      auto_generated: true,
      organization_id: ctx.organizationId,
    }).select().single();

    // Normalize roles
    const validRoles = ["analyst", "pm", "architect", "sm", "po", "dev", "qa", "devops", "ux_expert", "aios_master", "aios_orchestrator"];
    const roleAliases: Record<string, string> = {
      developer: "dev", backend: "dev", frontend: "dev", fullstack: "dev", engineer: "dev",
      "software engineer": "dev", "full-stack": "dev", "back-end": "dev", "front-end": "dev",
      product_manager: "pm", "product manager": "pm", product_owner: "po", "product owner": "po",
      scrum_master: "sm", "scrum master": "sm", "tech lead": "architect", "tech_lead": "architect",
      designer: "ux_expert", ux: "ux_expert", ui: "ux_expert", "ux/ui": "ux_expert", "ui/ux": "ux_expert",
      "ux designer": "ux_expert", "ui designer": "ux_expert",
      tester: "qa", quality: "qa", "quality assurance": "qa", testing: "qa",
      infrastructure: "devops", ops: "devops", "dev ops": "devops", sre: "devops",
      analysis: "analyst", business_analyst: "analyst", "business analyst": "analyst",
      master: "sm", orchestrator: "aios_orchestrator",
    };
    const normalizeRole = (r: string) => {
      const lower = (r || "").toLowerCase().trim();
      if (validRoles.includes(lower)) return lower;
      return roleAliases[lower] || "dev";
    };

    const createdAgents: any[] = [];
    const failedAgents: any[] = [];
    for (const ag of agents) {
      if (!ag.name) { failedAgents.push(ag); continue; }
      const normalizedRole = normalizeRole(ag.role);
      const { data: agentData, error: agentErr } = await serviceClient.from("agents").insert({
        user_id: user.id, name: ag.name, role: normalizedRole,
        description: `${ag.description || ""}\n\nJustificativa: ${ag.justification || ""}`,
        organization_id: ctx.organizationId,
        workspace_id: initiative.workspace_id, status: "active",
      }).select("id, name, role").single();

      if (agentErr) {
        console.error("Failed to create agent:", ag.name, "role:", ag.role, "->", normalizedRole, "error:", agentErr.message);
        failedAgents.push({ ...ag, normalizedRole, error: agentErr.message });
        continue;
      }

      if (agentData && squad) {
        await serviceClient.from("squad_members").insert({
          squad_id: squad.id, agent_id: agentData.id, role_in_squad: normalizedRole,
        });
        createdAgents.push(agentData);
      }
    }

    if (createdAgents.length === 0) {
      if (squad) await serviceClient.from("squads").delete().eq("id", squad.id);
      throw new Error(`Nenhum agente foi criado com sucesso. ${failedAgents.length} falha(s). Tente novamente.`);
    }

    await updateInitiative(ctx, { stage_status: "squad_formed" });
    if (jobId) await completeJob(ctx, jobId, { agents: createdAgents, squad_id: squad?.id, strategy: squad_strategy, failed: failedAgents }, aiResult);
    await pipelineLog(ctx, "pipeline_squad_complete", `Squad formado: ${createdAgents.length} agentes (${failedAgents.length} falhas)`, { tokens: aiResult.tokens, cost_usd: aiResult.costUsd });

    return jsonResponse({
      success: true, squad_id: squad?.id, agents: createdAgents,
      strategy: squad_strategy, tokens: aiResult.tokens, job_id: jobId,
      failed_agents: failedAgents.length,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "squad_ready" });
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
