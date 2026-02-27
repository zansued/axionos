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

    // Rate limit check
    const { allowed } = await checkRateLimit(user.id, "execute-subtask");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em breve." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subtaskId, agentId, storyContext } = await req.json();
    if (!subtaskId || !agentId) {
      return new Response(JSON.stringify({ error: "subtaskId and agentId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured");

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

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      // Mark as failed
      await supabase.from("story_subtasks").update({ status: "failed" }).eq("id", subtaskId);
      const t = await response.text();
      console.error("DeepSeek error:", response.status, t);
      return new Response(JSON.stringify({ error: `Erro na API DeepSeek (${response.status})` }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const output = aiData.choices?.[0]?.message?.content;

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

    // Log audit event
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "agent_executed_subtask",
      category: "execution",
      entity_type: "story_subtasks",
      entity_id: subtaskId,
      message: `Agente @${agent.name} (${agent.role}) executou subtask: ${subtask.description}`,
      severity: "info",
      metadata: { agent_id: agentId, agent_name: agent.name, agent_role: agent.role },
    });

    return new Response(JSON.stringify({ output, status: "completed" }), {
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
