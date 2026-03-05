import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, corsHeaders, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { callAIRaw } from "../_shared/ai-client.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const auth = await authenticateWithRateLimit(req, "generate-planning-content");
    if (auth instanceof Response) return auth;

    const { title, type, existingPrd } = await req.json();

    let systemPrompt: string;
    let userPrompt: string;

    if (type === "prd") {
      systemPrompt = `Você é um Analista de Produto sênior especializado em criar PRDs detalhados e acionáveis. Responda sempre em português brasileiro. Use markdown.`;
      userPrompt = `Crie um PRD completo para: "${title}"\n\nInclua:\n## Visão Geral\n## Problema a Resolver\n## Personas e Casos de Uso\n## Requisitos Funcionais\n## Requisitos Não-Funcionais\n## Critérios de Aceite\n## Métricas de Sucesso\n## Riscos e Mitigações`;
    } else if (type === "architecture") {
      systemPrompt = `Você é um Arquiteto de Software sênior especializado em design de sistemas escaláveis. Responda em português brasileiro. Use markdown.`;
      userPrompt = `Com base no PRD, crie um documento de arquitetura técnica:\n\nPRD:\n${existingPrd || "Projeto: " + title}\n\nInclua:\n## Stack Tecnológica\n## Arquitetura do Sistema\n## Componentes Principais\n## Modelo de Dados\n## APIs e Integrações\n## Fluxos de Dados\n## Segurança\n## Escalabilidade e Performance\n## Plano de Deploy`;
    } else {
      throw new Error("Invalid type. Use 'prd' or 'architecture'.");
    }

    const response = await callAIRaw(systemPrompt, userPrompt, { stream: true });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI Gateway error:", response.status, t);
      return errorResponse(`Erro na AI Gateway (${response.status})`, response.status);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-planning-content error:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro desconhecido");
  }
});
