import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";

/**
 * generate-planning-content — Background Job Pattern
 *
 * Uses EdgeRuntime.waitUntil() to process AI in background.
 * Uses callAI (non-streaming) instead of callAIRaw to avoid SSE parsing issues.
 * The client polls the planning_sessions table for updates.
 */

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const auth = await authenticateWithRateLimit(req, "generate-planning-content");
    if (auth instanceof Response) return auth;

    const { title, type, existingPrd, sessionId } = await req.json();

    if (!sessionId) {
      return errorResponse("sessionId is required", 400);
    }

    if (type !== "prd" && type !== "architecture") {
      return errorResponse("Invalid type. Use 'prd' or 'architecture'.", 400);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY") || "";

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Mark session as generating
    const fieldName = type === "prd" ? "prd_content" : "architecture_content";
    await serviceClient
      .from("planning_sessions")
      .update({ [fieldName]: "⏳ Gerando..." })
      .eq("id", sessionId);

    // Build prompt
    let prompt: string;

    if (type === "prd") {
      prompt = `Você é um Analista de Produto sênior. Crie um PRD completo e detalhado em português brasileiro usando markdown para: "${title}"

Inclua as seguintes seções:
## Visão Geral
## Problema a Resolver
## Personas e Casos de Uso
## Requisitos Funcionais
## Requisitos Não-Funcionais
## Critérios de Aceite
## Métricas de Sucesso
## Riscos e Mitigações`;
    } else {
      prompt = `Você é um Arquiteto de Software sênior. Crie um documento de arquitetura técnica completo em português brasileiro usando markdown.

Projeto: "${title}"
${existingPrd ? `\nPRD existente:\n${existingPrd.slice(0, 3000)}` : ""}

Inclua:
## Stack Tecnológica
## Arquitetura do Sistema
## Componentes Principais
## Modelo de Dados
## APIs e Integrações
## Fluxos de Dados
## Segurança
## Escalabilidade e Performance
## Plano de Deploy`;
    }

    // Background processing — return immediately, generate in background
    const backgroundTask = (async () => {
      try {
        console.log(`[generate-planning-content] Starting ${type} for session ${sessionId}`);
        
        const content = await callAI(apiKey, prompt, `planning-${type}`);

        // Save final content to DB
        await serviceClient
          .from("planning_sessions")
          .update({ [fieldName]: content || "⚠️ Geração vazia" })
          .eq("id", sessionId);

        console.log(`[generate-planning-content] ${type} generated for session ${sessionId} (${content.length} chars)`);
      } catch (e) {
        console.error("[generate-planning-content] Background error:", e);
        await serviceClient
          .from("planning_sessions")
          .update({ [fieldName]: `❌ Erro: ${e instanceof Error ? e.message : "desconhecido"}` })
          .eq("id", sessionId);
      }
    })();

    // Use EdgeRuntime.waitUntil to process in background
    // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundTask);
    } else {
      // Fallback: await directly
      await backgroundTask;
    }

    return jsonResponse({ status: "generating", sessionId, field: fieldName });
  } catch (e) {
    console.error("generate-planning-content error:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro desconhecido");
  }
});
