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

    // Rate limit
    const { allowed } = await checkRateLimit(user.id, "analyze-artifact");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em breve." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { artifactId } = await req.json();
    if (!artifactId) throw new Error("artifactId is required");

    // Fetch artifact with related data
    const { data: artifact, error: artErr } = await supabase
      .from("agent_outputs")
      .select("*, agents(name, role)")
      .eq("id", artifactId)
      .single();

    if (artErr || !artifact) throw new Error("Artefato não encontrado");

    // Fetch previous reviews
    const { data: reviews } = await supabase
      .from("artifact_reviews")
      .select("action, comment, created_at")
      .eq("output_id", artifactId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch related validations
    const { data: validations } = await supabase
      .from("validation_runs")
      .select("type, result, logs")
      .eq("artifact_id", artifactId)
      .order("executed_at", { ascending: false })
      .limit(3);

    // Build context for AI
    const rawOutputStr = typeof artifact.raw_output === "object"
      ? JSON.stringify(artifact.raw_output, null, 2)
      : String(artifact.raw_output);

    const reviewHistory = reviews?.length
      ? reviews.map((r: any) => `- [${r.action}] ${r.comment || "sem comentário"}`).join("\n")
      : "Nenhuma revisão anterior.";

    const validationHistory = validations?.length
      ? validations.map((v: any) => `- [${v.type}] Resultado: ${v.result} ${v.logs ? `| Logs: ${v.logs.substring(0, 200)}` : ""}`).join("\n")
      : "Nenhuma validação executada.";

    const typeLabels: Record<string, string> = {
      code: "Código",
      content: "Conteúdo/Documento",
      decision: "Decisão Arquitetural (ADR)",
      analysis: "Análise Técnica",
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um revisor técnico sênior do AxionOS, um sistema de governança de pipelines de IA. Sua função é analisar artefatos produzidos por agentes de IA e emitir um veredito técnico fundamentado.

Você deve avaliar com base em:
1. **Qualidade técnica**: O conteúdo é bem estruturado, completo e correto?
2. **Aderência ao padrão**: Segue boas práticas da área (código, documentação, decisão)?
3. **Riscos**: Existem riscos de segurança, performance ou manutenibilidade?
4. **Completude**: Cobre todos os aspectos esperados para o tipo de artefato?

Responda SEMPRE em português brasileiro com o seguinte formato JSON:
{
  "verdict": "approve" | "reject" | "request_changes",
  "confidence": number (0-100),
  "summary": "Resumo de 1-2 frases do veredito",
  "strengths": ["pontos fortes"],
  "issues": ["problemas encontrados"],
  "suggestions": ["sugestões de melhoria"],
  "risk_level": "low" | "medium" | "high" | "critical"
}`;

    const userPrompt = `Analise o seguinte artefato:

**Tipo:** ${typeLabels[artifact.type] || artifact.type}
**Status atual:** ${artifact.status}
**Agente responsável:** ${artifact.agents?.name || "Desconhecido"} (${artifact.agents?.role || "N/A"})
**Modelo usado:** ${artifact.model_used || "N/A"}
**Resumo:** ${artifact.summary || "Sem resumo"}

**Conteúdo do artefato:**
\`\`\`
${rawOutputStr.substring(0, 8000)}
\`\`\`

**Histórico de revisões:**
${reviewHistory}

**Validações:**
${validationHistory}

Com base nesta análise, emita seu veredito técnico.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "emit_verdict",
              description: "Emite o veredito técnico da análise do artefato",
              parameters: {
                type: "object",
                properties: {
                  verdict: { type: "string", enum: ["approve", "reject", "request_changes"] },
                  confidence: { type: "number" },
                  summary: { type: "string" },
                  strengths: { type: "array", items: { type: "string" } },
                  issues: { type: "array", items: { type: "string" } },
                  suggestions: { type: "array", items: { type: "string" } },
                  risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                },
                required: ["verdict", "confidence", "summary", "strengths", "issues", "suggestions", "risk_level"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_verdict" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições da IA excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`Erro na análise IA (${response.status})`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let analysis;
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content as JSON
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      }
    }

    if (!analysis) throw new Error("IA não retornou análise válida");

    // Record the AI analysis as a review
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceSupabase.from("artifact_reviews").insert({
      output_id: artifactId,
      reviewer_id: user.id,
      action: "ai_analysis",
      previous_status: artifact.status,
      new_status: artifact.status,
      comment: JSON.stringify(analysis),
    });

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-artifact error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
