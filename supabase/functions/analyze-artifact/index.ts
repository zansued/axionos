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

    const { allowed } = await checkRateLimit(user.id, "analyze-artifact");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em breve." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { artifactId, autoDecide } = await req.json();
    if (!artifactId) throw new Error("artifactId is required");

    const { data: artifact, error: artErr } = await supabase
      .from("agent_outputs")
      .select("*, agents(name, role)")
      .eq("id", artifactId)
      .single();

    if (artErr || !artifact) throw new Error("Artefato não encontrado");

    const { data: reviews } = await supabase
      .from("artifact_reviews")
      .select("action, comment, created_at")
      .eq("output_id", artifactId)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: validations } = await supabase
      .from("validation_runs")
      .select("type, result, logs")
      .eq("artifact_id", artifactId)
      .order("executed_at", { ascending: false })
      .limit(3);

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

    const userPrompt = `Você é um revisor técnico sênior do AxionOS, um sistema de governança de pipelines de IA. Analise o artefato abaixo e emita um veredito técnico fundamentado.

Avalie com base em:
1. Qualidade técnica: O conteúdo é bem estruturado, completo e correto?
2. Aderência ao padrão: Segue boas práticas da área?
3. Riscos: Existem riscos de segurança, performance ou manutenibilidade?
4. Completude: Cobre todos os aspectos esperados?

**Artefato:**
- Tipo: ${typeLabels[artifact.type] || artifact.type}
- Status atual: ${artifact.status}
- Agente: ${artifact.agents?.name || "Desconhecido"} (${artifact.agents?.role || "N/A"})
- Modelo: ${artifact.model_used || "N/A"}
- Resumo: ${artifact.summary || "Sem resumo"}

**Conteúdo:**
\`\`\`
${rawOutputStr.substring(0, 8000)}
\`\`\`

**Histórico de revisões:**
${reviewHistory}

**Validações:**
${validationHistory}

Responda APENAS com um JSON válido neste formato exato, sem markdown ou texto extra:
{"verdict":"approve|reject|request_changes","confidence":0-100,"summary":"resumo 1-2 frases","strengths":["pontos fortes"],"issues":["problemas"],"suggestions":["sugestões"],"risk_level":"low|medium|high|critical"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI Gateway error:", response.status, t);
      throw new Error(`Erro na AI Gateway (${response.status})`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI não retornou dados");

    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta da IA não contém JSON válido");

    const analysis = JSON.parse(jsonMatch[0]);

    // Capture reasoning_content if available
    const reasoning = aiData.choices?.[0]?.message?.reasoning_content || null;

    // Record the AI analysis as a review (include reasoning in comment)
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const reviewComment = reasoning
      ? JSON.stringify({ ...analysis, reasoning_summary: reasoning.substring(0, 1000) })
      : JSON.stringify(analysis);

    await serviceSupabase.from("artifact_reviews").insert({
      output_id: artifactId,
      reviewer_id: user.id,
      action: "ai_analysis",
      previous_status: artifact.status,
      new_status: artifact.status,
      comment: reviewComment,
    });

    // === Auto-decide mode: automatically approve/reject based on verdict ===
    let autoDecision = null;
    if (autoDecide && analysis.verdict) {
      const confidence = analysis.confidence || 0;

      if (analysis.verdict === "approve" && confidence >= 70) {
        await serviceSupabase.from("agent_outputs")
          .update({ status: "approved" })
          .eq("id", artifactId);

        await serviceSupabase.from("artifact_reviews").insert({
          output_id: artifactId,
          reviewer_id: user.id,
          action: "auto_approved",
          previous_status: artifact.status,
          new_status: "approved",
          comment: `Aprovado automaticamente pela IA. Confiança: ${confidence}%. Risco: ${analysis.risk_level}.`,
        });

        autoDecision = { action: "auto_approved", new_status: "approved" };
      } else if (analysis.verdict === "reject" && confidence >= 60) {
        await serviceSupabase.from("agent_outputs")
          .update({ status: "rejected" })
          .eq("id", artifactId);

        await serviceSupabase.from("artifact_reviews").insert({
          output_id: artifactId,
          reviewer_id: user.id,
          action: "auto_rejected",
          previous_status: artifact.status,
          new_status: "rejected",
          comment: `Rejeitado automaticamente pela IA. Confiança: ${confidence}%. Issues: ${(analysis.issues || []).join("; ")}`,
        });

        autoDecision = { action: "auto_rejected", new_status: "rejected" };
      } else if (analysis.verdict === "request_changes") {
        await serviceSupabase.from("agent_outputs")
          .update({ status: "pending_review" })
          .eq("id", artifactId);

        await serviceSupabase.from("artifact_reviews").insert({
          output_id: artifactId,
          reviewer_id: user.id,
          action: "ai_request_changes",
          previous_status: artifact.status,
          new_status: "pending_review",
          comment: `IA solicita alterações. Score de confiança: ${confidence}%. Sugestões: ${(analysis.suggestions || []).join("; ")}`,
        });

        autoDecision = { action: "request_changes", new_status: "pending_review" };
      }
    }

    return new Response(JSON.stringify({ success: true, analysis, reasoning: reasoning?.substring(0, 2000) || null, autoDecision }), {
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
