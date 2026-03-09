import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { callAIRaw } from "../_shared/ai-client.ts";

/**
 * generate-planning-content — Background Job Pattern
 *
 * Instead of streaming through the edge function (which times out),
 * we start the AI call in background via EdgeRuntime.waitUntil(),
 * save the result directly to planning_sessions, and return immediately.
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

    // Build prompts
    let systemPrompt: string;
    let userPrompt: string;

    if (type === "prd") {
      systemPrompt = `Você é um Analista de Produto sênior especializado em criar PRDs detalhados e acionáveis. Responda sempre em português brasileiro. Use markdown.`;
      userPrompt = `Crie um PRD completo para: "${title}"\n\nInclua:\n## Visão Geral\n## Problema a Resolver\n## Personas e Casos de Uso\n## Requisitos Funcionais\n## Requisitos Não-Funcionais\n## Critérios de Aceite\n## Métricas de Sucesso\n## Riscos e Mitigações`;
    } else {
      systemPrompt = `Você é um Arquiteto de Software sênior especializado em design de sistemas escaláveis. Responda em português brasileiro. Use markdown.`;
      userPrompt = `Com base no PRD, crie um documento de arquitetura técnica:\n\nPRD:\n${existingPrd || "Projeto: " + title}\n\nInclua:\n## Stack Tecnológica\n## Arquitetura do Sistema\n## Componentes Principais\n## Modelo de Dados\n## APIs e Integrações\n## Fluxos de Dados\n## Segurança\n## Escalabilidade e Performance\n## Plano de Deploy`;
    }

    // Background processing — return immediately, generate in background
    const backgroundTask = (async () => {
      try {
        const response = await callAIRaw(systemPrompt, userPrompt, { stream: true });

        if (!response.ok) {
          const t = await response.text();
          console.error("AI Gateway error:", response.status, t);
          await serviceClient
            .from("planning_sessions")
            .update({ [fieldName]: `❌ Erro na geração (${response.status})` })
            .eq("id", sessionId);
          return;
        }

        // Read the full streamed response
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullContent += content;
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        // Save final content to DB
        await serviceClient
          .from("planning_sessions")
          .update({ [fieldName]: fullContent || "⚠️ Geração vazia" })
          .eq("id", sessionId);

        console.log(`[generate-planning-content] ${type} generated for session ${sessionId} (${fullContent.length} chars)`);
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
      EdgeRuntime.waitUntil(backgroundTask);
    } else {
      // Fallback: await directly (will work but may timeout on very long generations)
      await backgroundTask;
    }

    return jsonResponse({ status: "generating", sessionId, field: fieldName });
  } catch (e) {
    console.error("generate-planning-content error:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro desconhecido");
  }
});
