import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const auth = await authenticateWithRateLimit(req, "organize-stories");
    if (auth instanceof Response) return auth;
    const { user, userClient } = auth;

    // Fetch stories with phases/subtasks
    const { data: stories, error: storiesError } = await userClient
      .from("stories")
      .select("id, title, description, priority, status, assigned_agent_id, story_phases(id, name, story_subtasks(id, description, status))")
      .order("created_at", { ascending: false });

    if (storiesError) throw storiesError;

    // Fetch active agents
    const { data: agents, error: agentsError } = await userClient
      .from("agents")
      .select("id, name, role, description, exclusive_authorities")
      .eq("status", "active");

    if (agentsError) throw agentsError;
    if (!agents?.length) return errorResponse("Nenhum agente ativo disponível. Crie agentes primeiro.", 400);
    if (!stories?.length) return errorResponse("Nenhuma story encontrada.", 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

    const agentsSummary = agents.map((a) =>
      `- ID: ${a.id} | Nome: ${a.name} | Role: ${a.role} | Descrição: ${a.description || "N/A"} | Autoridades: ${(a.exclusive_authorities || []).join(", ") || "N/A"}`
    ).join("\n");

    const storiesSummary = stories.map((s) => {
      const subtasks = (s.story_phases || []).flatMap((p: any) =>
        (p.story_subtasks || []).map((st: any) => st.description)
      );
      return `- ID: ${s.id} | Título: ${s.title} | Descrição: ${s.description || "N/A"} | Prioridade: ${s.priority} | Status: ${s.status} | Subtasks: ${subtasks.join("; ") || "Nenhuma"}`;
    }).join("\n");

    const systemPrompt = `Você é um Scrum Master especialista. Atribua o agente mais adequado para cada story.\n\nRegras:\n1. Cada story = 1 agente.\n2. Match por role e subtasks.\n3. Distribua equilibradamente.\n4. Retorne APENAS JSON válido.`;

    const userPrompt = `AGENTES DISPONÍVEIS:\n${agentsSummary}\n\nSTORIES:\n${storiesSummary}\n\nJSON: {"assignments": [{"story_id": "uuid", "agent_id": "uuid", "reasoning": "justificativa"}]}`;

    const result = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt, true);
    const { assignments } = JSON.parse(result.content);

    const agentIds = new Set(agents.map((a) => a.id));
    const storyIds = new Set(stories.map((s) => s.id));
    const results = [];

    for (const assignment of assignments) {
      if (!storyIds.has(assignment.story_id) || !agentIds.has(assignment.agent_id)) {
        console.warn("Invalid assignment:", assignment);
        continue;
      }

      const { error } = await userClient
        .from("stories")
        .update({ assigned_agent_id: assignment.agent_id })
        .eq("id", assignment.story_id);

      if (error) { console.error("Error updating story:", error); continue; }

      const agent = agents.find((a) => a.id === assignment.agent_id);
      const story = stories.find((s) => s.id === assignment.story_id);
      results.push({
        story_title: story?.title,
        agent_name: agent?.name,
        agent_role: agent?.role,
        reasoning: assignment.reasoning,
      });

      await userClient.from("audit_logs").insert({
        user_id: user.id,
        action: "ai_agent_assignment",
        category: "organization",
        entity_type: "stories",
        entity_id: assignment.story_id,
        message: `IA atribuiu agente @${agent?.name} (${agent?.role}) à story "${story?.title}": ${assignment.reasoning}`,
        severity: "info",
      });
    }

    return jsonResponse({ assignments: results });
  } catch (e) {
    console.error("organize-stories error:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro desconhecido");
  }
});
