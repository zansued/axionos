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
    // Validate authentication
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
    const { allowed, remaining } = await checkRateLimit(user.id, "generate-planning-content");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em breve." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, type, existingPrd } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt: string;
    let userPrompt: string;

    if (type === "prd") {
      systemPrompt = `Você é um Analista de Produto sênior especializado em criar PRDs (Product Requirements Documents) detalhados e acionáveis. Responda sempre em português brasileiro. Use markdown para formatação.`;
      userPrompt = `Crie um PRD completo para a seguinte feature/projeto: "${title}"

Inclua as seguintes seções:
## Visão Geral
## Problema a Resolver
## Personas e Casos de Uso
## Requisitos Funcionais
## Requisitos Não-Funcionais
## Critérios de Aceite
## Métricas de Sucesso
## Riscos e Mitigações`;
    } else if (type === "architecture") {
      systemPrompt = `Você é um Arquiteto de Software sênior especializado em design de sistemas escaláveis e modernos. Responda sempre em português brasileiro. Use markdown para formatação.`;
      userPrompt = `Com base no seguinte PRD, crie um documento de arquitetura técnica detalhado:

PRD:
${existingPrd || "Projeto: " + title}

Inclua as seguintes seções:
## Stack Tecnológica
## Arquitetura do Sistema
## Componentes Principais
## Modelo de Dados
## APIs e Integrações
## Fluxos de Dados
## Segurança
## Escalabilidade e Performance
## Plano de Deploy`;
    } else {
      throw new Error("Invalid type. Use 'prd' or 'architecture'.");
    }

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    const aiUrl = OPENAI_KEY ? "https://api.openai.com/v1/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const aiKey = OPENAI_KEY || LOVABLE_API_KEY;
    const aiModel = OPENAI_KEY ? "gpt-4o-mini" : "google/gemini-2.5-flash";

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
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI Gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: `Erro na AI Gateway (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-planning-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
