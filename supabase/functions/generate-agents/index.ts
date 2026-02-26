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

    const { projectDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um especialista em montagem de equipes de IA para o framework AIOS. Com base na descrição do projeto, sugira os agentes ideais para compor o time. Cada agente deve ter um nome curto (estilo @agent-name), um papel (role), uma descrição do que faz e autoridades exclusivas quando aplicável. Use a função generate_agents para retornar os dados.`;

    const userPrompt = `Projeto: ${projectDescription}

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

Escolha os papéis mais relevantes para o projeto descrito. Dê nomes criativos e descritivos aos agentes.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_agents",
            description: "Generate a team of AI agents for the project",
            parameters: {
              type: "object",
              properties: {
                agents: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Agent name (e.g. atlas-analyst)" },
                      role: { type: "string", enum: ["analyst", "pm", "architect", "ux_expert", "sm", "po", "dev", "devops", "qa", "aios_master", "aios_orchestrator"] },
                      description: { type: "string", description: "What this agent does" },
                      exclusive_authorities: { type: "array", items: { type: "string" }, description: "Exclusive permissions" },
                    },
                    required: ["name", "role", "description", "exclusive_authorities"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["agents"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_agents" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const { agents } = JSON.parse(toolCall.function.arguments);

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
