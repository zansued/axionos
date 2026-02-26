import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { title, prdContent, architectureContent } = await req.json();
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured");

    const systemPrompt = `Você é um Product Manager sênior. Com base no PRD e na Arquitetura fornecidos, gere user stories bem definidas. Cada story deve ter título, descrição, prioridade e fases com subtasks. Retorne APENAS um JSON válido no formato especificado, sem markdown ou texto extra.`;

    const userPrompt = `Projeto: ${title}

PRD:
${prdContent || "Não disponível"}

Arquitetura:
${architectureContent || "Não disponível"}

Gere de 3 a 8 user stories cobrindo os principais requisitos do PRD. Retorne um JSON com esta estrutura exata:
{"stories": [{"title": "string", "description": "string", "priority": "low|medium|high|critical", "phases": [{"name": "string", "subtasks": ["string"]}]}]}`;

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
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("DeepSeek error:", response.status, t);
      return new Response(JSON.stringify({ error: `Erro na API DeepSeek (${response.status})` }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI did not return data");

    const { stories } = JSON.parse(content);

    const createdStories = [];
    for (const story of stories) {
      const { data: storyData, error: storyError } = await supabase
        .from("stories")
        .insert({
          user_id: userId,
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
        const { data: phaseData, error: phaseError } = await supabase
          .from("story_phases")
          .insert({
            story_id: storyData.id,
            name: phase.name,
            sort_order: pi,
          })
          .select()
          .single();

        if (phaseError) {
          console.error("Error creating phase:", phaseError);
          continue;
        }

        for (let si = 0; si < phase.subtasks.length; si++) {
          await supabase.from("story_subtasks").insert({
            phase_id: phaseData.id,
            description: phase.subtasks[si],
            sort_order: si,
          });
        }
      }

      createdStories.push({ id: storyData.id, title: story.title });
    }

    return new Response(JSON.stringify({ stories: createdStories }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-stories error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
