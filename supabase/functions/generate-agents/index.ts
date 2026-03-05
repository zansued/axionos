import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const auth = await authenticateWithRateLimit(req, "generate-agents");
    if (auth instanceof Response) return auth;
    const { user, userClient } = auth;

    const { projectDescription, missingRoles } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

    const rolesToGenerate = missingRoles && missingRoles.length > 0 ? missingRoles : null;

    const systemPrompt = `Você é um especialista em montagem de equipes de IA para o framework AIOS. Com base na descrição do projeto, sugira os agentes ideais para compor o time. Retorne APENAS um JSON válido no formato especificado, sem markdown ou texto extra.`;

    const userPrompt = rolesToGenerate
      ? `Projeto: ${projectDescription}\n\nGere exatamente ${rolesToGenerate.length} agente(s) IA para os seguintes papéis faltantes: ${rolesToGenerate.join(", ")}.\n\nDescrição dos papéis:\n- analyst: Analista de requisitos e negócios\n- pm: Product Manager\n- architect: Arquiteto de software\n- ux_expert: Especialista em UX/UI\n- sm: Scrum Master\n- po: Product Owner\n- dev: Desenvolvedor\n- devops: DevOps / Infraestrutura\n- qa: Quality Assurance\n- aios_master: Controlador master do AIOS\n- aios_orchestrator: Orquestrador de agentes\n\nRetorne um JSON com esta estrutura exata:\n{"agents": [{"name": "string (estilo agent-name)", "role": "string (um dos papéis acima)", "description": "string", "exclusive_authorities": ["string"]}]}`
      : `Projeto: ${projectDescription}\n\nGere um time de 4 a 8 agentes IA otimizado para este projeto. Os papéis disponíveis são:\n- analyst, pm, architect, ux_expert, sm, po, dev, devops, qa, aios_master, aios_orchestrator\n\nRetorne um JSON: {"agents": [{"name": "string", "role": "string", "description": "string", "exclusive_authorities": ["string"]}]}`;

    const result = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt, true);
    const { agents } = JSON.parse(result.content);

    const createdAgents = [];
    for (const agent of agents) {
      const { data, error } = await userClient
        .from("agents")
        .insert({
          user_id: user.id,
          name: agent.name,
          role: agent.role,
          description: agent.description,
          exclusive_authorities: agent.exclusive_authorities || [],
          status: "active",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating agent:", error);
        continue;
      }
      createdAgents.push({ id: data.id, name: data.name, role: data.role });
    }

    return jsonResponse({ agents: createdAgents });
  } catch (e) {
    console.error("generate-agents error:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro desconhecido");
  }
});
