import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
