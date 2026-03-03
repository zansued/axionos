import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { allowed } = await checkRateLimit(user.id, "execute-subtask");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em breve." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subtaskId, agentId, storyContext, organizationId, workspaceId } = await req.json();
    if (!subtaskId || !agentId) {
      return new Response(JSON.stringify({ error: "subtaskId and agentId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch subtask details
    const { data: subtask, error: subtaskError } = await supabase
      .from("story_subtasks")
      .select("*, story_phases(name, story_id, stories(title, description))")
      .eq("id", subtaskId)
      .single();

    if (subtaskError || !subtask) {
      return new Response(JSON.stringify({ error: "Subtask not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch agent details
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    await supabase.from("story_subtasks").update({
      status: "in_progress",
      executed_by_agent_id: agentId,
    }).eq("id", subtaskId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      await supabase.from("story_subtasks").update({ status: "failed" }).eq("id", subtaskId);
      const t = await response.text();
      console.error("AI Gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: `Erro na AI Gateway (${response.status})` }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const output = aiData.choices?.[0]?.message?.content;
    const tokensUsed = aiData.usage?.total_tokens || 0;

    if (!output) {
      await supabase.from("story_subtasks").update({ status: "failed" }).eq("id", subtaskId);
      throw new Error("AI did not return output");
    }

    // Update subtask with output
    await supabase.from("story_subtasks").update({
      output,
      status: "completed",
      executed_at: new Date().toISOString(),
    }).eq("id", subtaskId);

    // Create versioned agent_output artifact
    let artifactId: string | null = null;
    if (organizationId) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

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
        raw_output: { text: output, model_response: aiData },
        model_used: "google/gemini-2.5-flash",
        prompt_used: userPrompt.slice(0, 2000),
        tokens_used: tokensUsed,
        cost_estimate: tokensUsed * 0.000001,
      }).select("id").single();

      artifactId = artifact?.id || null;

      // Auto-create ADR for architect decisions
      if (outputType === "decision" && artifactId) {
        await serviceClient.from("adrs").insert({
          output_id: artifactId,
          title: `Decisão: ${subtask.description?.slice(0, 100)}`,
          context: storyContext || storyDesc,
          decision: output.slice(0, 5000),
          consequences: "",
          status: "proposed",
        });
      }
    }

    // Log audit event
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "agent_executed_subtask",
      category: "execution",
      entity_type: "story_subtasks",
      entity_id: subtaskId,
      message: `Agente @${agent.name} (${agent.role}) executou subtask: ${subtask.description}`,
      severity: "info",
      metadata: { agent_id: agentId, agent_name: agent.name, agent_role: agent.role, artifact_id: artifactId },
    });

    return new Response(JSON.stringify({ output, status: "completed", artifact_id: artifactId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("execute-subtask error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
