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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Rate limit check
    const { allowed } = await checkRateLimit(user.id, "organize-stories");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em breve." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch stories with phases/subtasks
    const { data: stories, error: storiesError } = await supabase
      .from("stories")
      .select("id, title, description, priority, status, assigned_agent_id, story_phases(id, name, story_subtasks(id, description, status))")
      .order("created_at", { ascending: false });

    if (storiesError) throw storiesError;

    // Fetch active agents
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("id, name, role, description, exclusive_authorities")
      .eq("status", "active");

    if (agentsError) throw agentsError;

    if (!agents?.length) {
      return new Response(JSON.stringify({ error: "Nenhum agente ativo disponível. Crie agentes primeiro." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!stories?.length) {
      return new Response(JSON.stringify({ error: "Nenhuma story encontrada." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context for AI
    const agentsSummary = agents.map((a) =>
      `- ID: ${a.id} | Nome: ${a.name} | Role: ${a.role} | Descrição: ${a.description || "N/A"} | Autoridades: ${(a.exclusive_authorities || []).join(", ") || "N/A"}`
    ).join("\n");

    const storiesSummary = stories.map((s) => {
      const subtasks = (s.story_phases || []).flatMap((p: any) =>
        (p.story_subtasks || []).map((st: any) => st.description)
      );
      return `- ID: ${s.id} | Título: ${s.title} | Descrição: ${s.description || "N/A"} | Prioridade: ${s.priority} | Status: ${s.status} | Subtasks: ${subtasks.join("; ") || "Nenhuma"}`;
    }).join("\n");

    const systemPrompt = `Você é um Scrum Master / Organizador de Equipe especialista. Sua missão é atribuir o agente mais adequado para cada story com base nas competências do agente (role, descrição, autoridades) e no contexto da story (título, descrição, subtasks).

Regras:
1. Cada story deve receber exatamente UM agente.
2. Considere o role do agente (dev, architect, qa, devops, analyst, pm, sm, ux_expert, etc.) e as subtasks da story para fazer o melhor match.
3. Stories de infraestrutura → devops. Stories de UI/UX → ux_expert ou dev. Stories de testes → qa. Stories de análise → analyst. Stories de arquitetura → architect.
4. Distribua o trabalho de forma equilibrada quando possível — evite sobrecarregar um único agente.
5. Retorne APENAS um JSON válido, sem markdown nem texto extra.`;

    const userPrompt = `AGENTES DISPONÍVEIS:
${agentsSummary}

STORIES PARA ORGANIZAR:
${storiesSummary}

Retorne um JSON com esta estrutura:
{"assignments": [{"story_id": "uuid", "agent_id": "uuid", "reasoning": "breve justificativa"}]}`;

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    const aiUrl = OPENAI_KEY ? "https://api.openai.com/v1/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const aiKey = OPENAI_KEY || LOVABLE_API_KEY;
    const aiModel = OPENAI_KEY ? "gpt-4o" : "google/gemini-2.5-flash";

    const response = await fetch(aiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI Gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: `Erro na AI Gateway (${response.status})` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI did not return data");

    const { assignments } = JSON.parse(content);

    // Validate and apply assignments
    const agentIds = new Set(agents.map((a) => a.id));
    const storyIds = new Set(stories.map((s) => s.id));
    const results = [];

    for (const assignment of assignments) {
      if (!storyIds.has(assignment.story_id) || !agentIds.has(assignment.agent_id)) {
        console.warn("Invalid assignment:", assignment);
        continue;
      }

      const { error } = await supabase
        .from("stories")
        .update({ assigned_agent_id: assignment.agent_id })
        .eq("id", assignment.story_id);

      if (error) {
        console.error("Error updating story:", error);
        continue;
      }

      const agent = agents.find((a) => a.id === assignment.agent_id);
      const story = stories.find((s) => s.id === assignment.story_id);
      results.push({
        story_title: story?.title,
        agent_name: agent?.name,
        agent_role: agent?.role,
        reasoning: assignment.reasoning,
      });

      // Log to audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "ai_agent_assignment",
        category: "organization",
        entity_type: "stories",
        entity_id: assignment.story_id,
        message: `IA atribuiu agente @${agent?.name} (${agent?.role}) à story "${story?.title}": ${assignment.reasoning}`,
        severity: "info",
      });
    }

    return new Response(JSON.stringify({ assignments: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("organize-stories error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
