import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit, requireOrgMembership } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const auth = await authenticateWithRateLimit(req, "execute-subtask");
    if (auth instanceof Response) return auth;
    const { user, userClient, serviceClient } = auth;

    const { subtaskId, agentId, storyContext, organizationId, workspaceId } = await req.json();
    if (!subtaskId || !agentId) {
      return errorResponse("subtaskId and agentId are required", 400);
    }

    // Fetch subtask details
    const { data: subtask, error: subtaskError } = await userClient
      .from("story_subtasks")
      .select("*, story_phases(name, story_id, stories(title, description))")
      .eq("id", subtaskId)
      .single();

    if (subtaskError || !subtask) return errorResponse("Subtask not found", 404);

    // Fetch agent details
    const { data: agent, error: agentError } = await userClient
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) return errorResponse("Agent not found", 404);

    const storyTitle = subtask.story_phases?.stories?.title || "Unknown";
    const storyDesc = subtask.story_phases?.stories?.description || "";
    const phaseName = subtask.story_phases?.name || "Unknown";

    const systemPrompt = `Você é o agente "${agent.name}" com o papel de "${agent.role}" no framework AIOS.
${agent.description ? `Descrição: ${agent.description}` : ""}
${agent.exclusive_authorities?.length ? `Autoridades exclusivas: ${agent.exclusive_authorities.join(", ")}` : ""}

Sua tarefa é executar a subtask abaixo com maestria, produzindo um output detalhado e profissional.
Responda em português do Brasil. Seja direto, técnico e completo.`;

    const userPrompt = `## Contexto
- **Story**: ${storyTitle}
- **Descrição**: ${storyDesc}
- **Fase**: ${phaseName}
${storyContext ? `- **Contexto adicional**: ${storyContext}` : ""}

## Subtask a executar
${subtask.description}

Produza o output completo para esta subtask. Inclua detalhes técnicos, decisões tomadas e artefatos gerados quando aplicável.`;

    // Mark as in_progress
    await userClient.from("story_subtasks").update({
      status: "in_progress",
      executed_by_agent_id: agentId,
    }).eq("id", subtaskId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
    const result = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt);

    if (!result.content) {
      await userClient.from("story_subtasks").update({ status: "failed" }).eq("id", subtaskId);
      throw new Error("AI did not return output");
    }

    // Update subtask with output
    await userClient.from("story_subtasks").update({
      output: result.content,
      status: "completed",
      executed_at: new Date().toISOString(),
    }).eq("id", subtaskId);

    // Create versioned agent_output artifact
    let artifactId: string | null = null;
    if (organizationId) {
      const memberCheck = await requireOrgMembership(serviceClient, user.id, organizationId);
      if (memberCheck instanceof Response) return memberCheck;
      const outputType = agent.role === "architect" ? "decision"
        : agent.role === "dev" || agent.role === "devops" ? "code"
        : agent.role === "analyst" || agent.role === "po" ? "content"
        : "analysis";

      const { data: artifact } = await serviceClient.from("agent_outputs").insert({
        organization_id: organizationId,
        workspace_id: workspaceId || null,
        agent_id: agentId,
        subtask_id: subtaskId,
        type: outputType,
        status: "draft",
        summary: subtask.description?.slice(0, 200),
        raw_output: { text: result.content },
        model_used: result.model,
        prompt_used: userPrompt.slice(0, 2000),
        tokens_used: result.tokens,
        cost_estimate: result.costUsd,
      }).select("id").single();

      artifactId = artifact?.id || null;

      // Auto-create ADR for architect decisions
      if (outputType === "decision" && artifactId) {
        await serviceClient.from("adrs").insert({
          output_id: artifactId,
          title: `Decisão: ${subtask.description?.slice(0, 100)}`,
          context: storyContext || storyDesc,
          decision: result.content.slice(0, 5000),
          consequences: "",
          status: "proposed",
        });
      }
    }

    // Log audit event
    await userClient.from("audit_logs").insert({
      user_id: user.id,
      action: "agent_executed_subtask",
      category: "execution",
      entity_type: "story_subtasks",
      entity_id: subtaskId,
      message: `Agente @${agent.name} (${agent.role}) executou subtask: ${subtask.description}`,
      severity: "info",
      metadata: { agent_id: agentId, agent_name: agent.name, agent_role: agent.role, artifact_id: artifactId },
    });

    return jsonResponse({ output: result.content, status: "completed", artifact_id: artifactId });
  } catch (e) {
    console.error("execute-subtask error:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro desconhecido");
  }
});
