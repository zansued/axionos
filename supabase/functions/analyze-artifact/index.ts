import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const auth = await authenticateWithRateLimit(req, "analyze-artifact");
    if (auth instanceof Response) return auth;
    const { user, userClient, serviceClient } = auth;

    const { artifactId, autoDecide } = await req.json();
    if (!artifactId) throw new Error("artifactId is required");

    const { data: artifact, error: artErr } = await userClient
      .from("agent_outputs")
      .select("*, agents(name, role)")
      .eq("id", artifactId)
      .single();

    if (artErr || !artifact) throw new Error("Artefato não encontrado");

    const { data: reviews } = await userClient
      .from("artifact_reviews")
      .select("action, comment, created_at")
      .eq("output_id", artifactId)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: validations } = await userClient
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
      code: "Código", content: "Conteúdo/Documento",
      decision: "Decisão Arquitetural (ADR)", analysis: "Análise Técnica",
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

    const userPrompt = `Você é um revisor técnico sênior do AxionOS. Analise o artefato abaixo e emita um veredito.

Avalie:
1. Qualidade técnica  2. Aderência ao padrão  3. Riscos  4. Completude

**Artefato:**
- Tipo: ${typeLabels[artifact.type] || artifact.type}
- Status: ${artifact.status}
- Agente: ${artifact.agents?.name || "?"} (${artifact.agents?.role || "N/A"})
- Resumo: ${artifact.summary || "Sem resumo"}

**Conteúdo:**
\`\`\`
${rawOutputStr.substring(0, 8000)}
\`\`\`

**Revisões:** ${reviewHistory}
**Validações:** ${validationHistory}

Responda APENAS com JSON:
{"verdict":"approve|reject|request_changes","confidence":0-100,"summary":"resumo","strengths":["pontos"],"issues":["problemas"],"suggestions":["sugestões"],"risk_level":"low|medium|high|critical"}`;

    // Use pro model for analysis
    const result = await callAI(LOVABLE_API_KEY, "", userPrompt, false, 3, true);

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta da IA não contém JSON válido");

    const analysis = JSON.parse(jsonMatch[0]);

    await serviceClient.from("artifact_reviews").insert({
      output_id: artifactId,
      reviewer_id: user.id,
      action: "ai_analysis",
      previous_status: artifact.status,
      new_status: artifact.status,
      comment: JSON.stringify(analysis),
    });

    // === Auto-decide mode ===
    let autoDecision = null;
    if (autoDecide && analysis.verdict) {
      const confidence = analysis.confidence || 0;

      if (analysis.verdict === "approve" && confidence >= 70) {
        await serviceClient.from("agent_outputs").update({ status: "approved" }).eq("id", artifactId);
        await serviceClient.from("artifact_reviews").insert({
          output_id: artifactId, reviewer_id: user.id, action: "auto_approved",
          previous_status: artifact.status, new_status: "approved",
          comment: `Aprovado automaticamente. Confiança: ${confidence}%. Risco: ${analysis.risk_level}.`,
        });
        autoDecision = { action: "auto_approved", new_status: "approved" };
      } else if (analysis.verdict === "reject" && confidence >= 60) {
        await serviceClient.from("agent_outputs").update({ status: "rejected" }).eq("id", artifactId);
        await serviceClient.from("artifact_reviews").insert({
          output_id: artifactId, reviewer_id: user.id, action: "auto_rejected",
          previous_status: artifact.status, new_status: "rejected",
          comment: `Rejeitado automaticamente. Confiança: ${confidence}%. Issues: ${(analysis.issues || []).join("; ")}`,
        });
        autoDecision = { action: "auto_rejected", new_status: "rejected" };
      } else if (analysis.verdict === "request_changes") {
        await serviceClient.from("agent_outputs").update({ status: "pending_review" }).eq("id", artifactId);
        await serviceClient.from("artifact_reviews").insert({
          output_id: artifactId, reviewer_id: user.id, action: "ai_request_changes",
          previous_status: artifact.status, new_status: "pending_review",
          comment: `IA solicita alterações. Score: ${confidence}%. Sugestões: ${(analysis.suggestions || []).join("; ")}`,
        });
        autoDecision = { action: "request_changes", new_status: "pending_review" };
      }
    }

    return jsonResponse({ success: true, analysis, autoDecision });
  } catch (e) {
    console.error("analyze-artifact error:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro desconhecido");
  }
});
