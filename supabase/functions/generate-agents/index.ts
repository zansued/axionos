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
    const userId = user.id;

    // Rate limit check
    const { allowed } = await checkRateLimit(userId, "generate-agents");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em breve." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { projectDescription, missingRoles } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const rolesToGenerate = missingRoles && missingRoles.length > 0 ? missingRoles : null;

    const systemPrompt = `Você é um especialista em montagem de equipes de IA para o framework AIOS. Com base na descrição do projeto, sugira os agentes ideais para compor o time. Retorne APENAS um JSON válido no formato especificado, sem markdown ou texto extra.`;

    const userPrompt = rolesToGenerate
      ? `Projeto: ${projectDescription}

Gere exatamente ${rolesToGenerate.length} agente(s) IA para os seguintes papéis faltantes: ${rolesToGenerate.join(", ")}.

Descrição dos papéis:
- analyst: Analista de requisitos e negócios
- pm: Product Manager
- architect: Arquiteto de software
- ux_expert: Especialista em UX/UI
- sm: Scrum Master
- po: Product Owner
- dev: Desenvolvedor
- devops: DevOps / Infraestrutura
- qa: Quality Assurance
- aios_master: Controlador master do AIOS
- aios_orchestrator: Orquestrador de agentes

Retorne um JSON com esta estrutura exata:
{"agents": [{"name": "string (estilo agent-name)", "role": "string (um dos papéis acima)", "description": "string", "exclusive_authorities": ["string"]}]}`
      : `Projeto: ${projectDescription}

Gere um time de 4 a 8 agentes IA otimizado para este projeto. Os papéis disponíveis são:
- analyst: Analista de requisitos e negócios
- pm: Product Manager
- architect: Arquiteto de software
- ux_expert: Especialista em UX/UI
- sm: Scrum Master
- po: Product Owner
- dev: Desenvolvedor
- devops: DevOps / Infraestrutura
- qa: Quality Assurance
- aios_master: Controlador master do AIOS
- aios_orchestrator: Orquestrador de agentes

Retorne um JSON com esta estrutura exata:
{"agents": [{"name": "string (estilo agent-name)", "role": "string (um dos papéis acima)", "description": "string", "exclusive_authorities": ["string"]}]}`;

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
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI Gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: `Erro na AI Gateway (${response.status})` }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI did not return data");

    const { agents } = JSON.parse(content);

    const createdAgents = [];
    for (const agent of agents) {
      const { data, error } = await supabase
        .from("agents")
        .insert({
          user_id: userId,
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

    return new Response(JSON.stringify({ agents: createdAgents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-agents error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
