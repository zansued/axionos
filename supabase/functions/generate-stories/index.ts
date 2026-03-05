import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const auth = await authenticateWithRateLimit(req, "generate-stories");
    if (auth instanceof Response) return auth;
    const { user, userClient } = auth;

    const { title, prdContent, architectureContent } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

    const systemPrompt = `Você é um Product Manager sênior. Com base no PRD e na Arquitetura fornecidos, gere user stories bem definidas. Cada story deve ter título, descrição, prioridade e fases com subtasks. Retorne APENAS um JSON válido no formato especificado, sem markdown ou texto extra.`;

    const userPrompt = `Projeto: ${title}\n\nPRD:\n${prdContent || "Não disponível"}\n\nArquitetura:\n${architectureContent || "Não disponível"}\n\nGere de 3 a 8 user stories cobrindo os principais requisitos do PRD. Retorne um JSON com esta estrutura exata:\n{"stories": [{"title": "string", "description": "string", "priority": "low|medium|high|critical", "phases": [{"name": "string", "subtasks": ["string"]}]}]}`;

    const result = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt, true);
    const { stories } = JSON.parse(result.content);

    const createdStories = [];
    for (const story of stories) {
      const { data: storyData, error: storyError } = await userClient
        .from("stories")
        .insert({
          user_id: user.id,
          title: story.title,
          description: story.description,
          priority: story.priority,
          status: "todo",
        })
        .select()
        .single();

      if (storyError) {
        console.error("Error creating story:", storyError);
        continue;
      }

      for (let pi = 0; pi < story.phases.length; pi++) {
        const phase = story.phases[pi];
        const { data: phaseData, error: phaseError } = await userClient
          .from("story_phases")
          .insert({ story_id: storyData.id, name: phase.name, sort_order: pi })
          .select()
          .single();

        if (phaseError) {
          console.error("Error creating phase:", phaseError);
          continue;
        }

        for (let si = 0; si < phase.subtasks.length; si++) {
          await userClient.from("story_subtasks").insert({
            phase_id: phaseData.id,
            description: phase.subtasks[si],
            sort_order: si,
          });
        }
      }
      createdStories.push({ id: storyData.id, title: story.title });
    }

    return jsonResponse({ stories: createdStories });
  } catch (e) {
    console.error("generate-stories error:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro desconhecido");
  }
});
