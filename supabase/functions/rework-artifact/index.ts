import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";

const MAX_REWORK_ITERATIONS = 3;

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const auth = await authenticateWithRateLimit(req, "rework-artifact");
    if (auth instanceof Response) return auth;
    const { user, userClient, serviceClient } = auth;

    const { artifactId, feedback, autoMode } = await req.json();
    if (!artifactId) throw new Error("artifactId is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

    // Fetch artifact with all context
    const { data: artifact, error: artErr } = await serviceClient
      .from("agent_outputs")
      .select("*, agents(id, name, role, description, exclusive_authorities)")
      .eq("id", artifactId)
      .single();

    if (artErr || !artifact) throw new Error("Artefato não encontrado");

    // Check rework iteration count
    const { count: reworkCount } = await serviceClient
      .from("artifact_reviews")
      .select("*", { count: "exact", head: true })
      .eq("output_id", artifactId)
      .eq("action", "auto_rework");

    if ((reworkCount || 0) >= MAX_REWORK_ITERATIONS) {
      await serviceClient.from("artifact_reviews").insert({
        output_id: artifactId, reviewer_id: user.id, action: "escalated_to_human",
        previous_status: artifact.status, new_status: "pending_review",
        comment: `Limite de ${MAX_REWORK_ITERATIONS} retrabalhos atingido. Escalado para revisão humana.`,
      });
      await serviceClient.from("agent_outputs").update({ status: "pending_review" }).eq("id", artifactId);
      return jsonResponse({ success: true, escalated: true, message: `Limite de retrabalhos (${MAX_REWORK_ITERATIONS}) atingido.` });
    }

    // Get subtask context
    let subtaskContext = "";
    if (artifact.subtask_id) {
      const { data: subtask } = await serviceClient
        .from("story_subtasks")
        .select("description, story_phases(name, stories(title, description))")
        .eq("id", artifact.subtask_id)
        .single();
      if (subtask) {
        const story = (subtask as any).story_phases?.stories;
        subtaskContext = `\n## Contexto Original\n- **Story**: ${story?.title || "N/A"}\n- **Fase**: ${(subtask as any).story_phases?.name || "N/A"}\n- **Subtask**: ${subtask.description}`;
      }
    }

    const agent = artifact.agents;
    const previousOutput = typeof artifact.raw_output === "object" && artifact.raw_output !== null && "text" in (artifact.raw_output as any)
      ? String((artifact.raw_output as any).text)
      : JSON.stringify(artifact.raw_output);

    const { data: reviews } = await serviceClient
      .from("artifact_reviews")
      .select("action, comment, created_at")
      .eq("output_id", artifactId)
      .order("created_at", { ascending: true });

    const feedbackHistory = reviews
      ?.filter((r: any) => r.comment && r.action !== "auto_rework")
      .map((r: any) => {
        if (r.action === "ai_analysis") {
          try {
            const analysis = JSON.parse(r.comment);
            return `[Análise IA] Veredito: ${analysis.verdict}\nProblemas: ${analysis.issues?.join("; ") || "N/A"}\nSugestões: ${analysis.suggestions?.join("; ") || "N/A"}`;
          } catch { return `[${r.action}] ${r.comment}`; }
        }
        return `[${r.action}] ${r.comment}`;
      })
      .join("\n\n") || "";

    const systemPrompt = `Você é o agente "${agent?.name || "Unknown"}" (${agent?.role || "N/A"}) no AxionOS.\nFaça RETRABALHO corrigindo TODOS os problemas. Produza output COMPLETO e revisado. Responda em pt-BR.`;
    const userPrompt = `${subtaskContext}\n\n## Output Anterior\n\`\`\`\n${previousOutput.substring(0, 6000)}\n\`\`\`\n\n## Feedback\n${feedback || feedbackHistory || "Corrigir problemas identificados."}\n\n## Histórico\n${feedbackHistory}\n\nProduza o output COMPLETO corrigido.`;

    const result = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt);
    const newOutput = result.content;

    // Update artifact
    await serviceClient.from("agent_outputs").update({
      raw_output: { text: newOutput, previous_version: artifact.raw_output },
      tokens_used: (artifact.tokens_used || 0) + result.tokens,
      cost_estimate: Number(artifact.cost_estimate || 0) + result.costUsd,
      model_used: result.model,
      status: autoMode ? "draft" : "pending_review",
      updated_at: new Date().toISOString(),
    }).eq("id", artifactId);

    if (artifact.subtask_id) {
      await serviceClient.from("story_subtasks").update({
        output: newOutput, executed_at: new Date().toISOString(),
      }).eq("id", artifact.subtask_id);
    }

    await serviceClient.from("artifact_reviews").insert({
      output_id: artifactId, reviewer_id: user.id, action: "auto_rework",
      previous_status: artifact.status, new_status: autoMode ? "draft" : "pending_review",
      comment: JSON.stringify({
        iteration: (reworkCount || 0) + 1, max_iterations: MAX_REWORK_ITERATIONS,
        tokens_used: result.tokens, trigger: autoMode ? "automatic" : "manual",
        feedback_summary: (feedback || "Baseado em análise IA").substring(0, 500),
      }),
    });

    await userClient.from("audit_logs").insert({
      user_id: user.id, action: "artifact_reworked", category: "execution",
      entity_type: "agent_outputs", entity_id: artifactId,
      message: `Artefato retrabalhado (iteração ${(reworkCount || 0) + 1}/${MAX_REWORK_ITERATIONS}) - ${autoMode ? "AUTOMÁTICO" : "MANUAL"}`,
      severity: "info",
      metadata: { agent_id: agent?.id, iteration: (reworkCount || 0) + 1, auto_mode: autoMode, tokens_used: result.tokens },
    });

    // If auto mode, trigger re-analysis
    let reanalysis = null;
    if (autoMode) {
      try {
        const authHeader = req.headers.get("Authorization")!;
        const analyzeResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-artifact`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
          body: JSON.stringify({ artifactId }),
        });
        if (analyzeResp.ok) {
          const analyzeData = await analyzeResp.json();
          reanalysis = analyzeData.analysis;
          if (reanalysis?.verdict === "approve") {
            await serviceClient.from("agent_outputs").update({ status: "approved" }).eq("id", artifactId);
            await serviceClient.from("artifact_reviews").insert({
              output_id: artifactId, reviewer_id: user.id, action: "auto_approved",
              previous_status: "draft", new_status: "approved",
              comment: `Aprovado automaticamente após retrabalho (iteração ${(reworkCount || 0) + 1}). Confiança: ${reanalysis.confidence}%`,
            });
          }
        }
      } catch (err) { console.error("Auto re-analysis failed:", err); }
    }

    return jsonResponse({
      success: true, iteration: (reworkCount || 0) + 1, max_iterations: MAX_REWORK_ITERATIONS,
      tokens_used: result.tokens, auto_mode: autoMode, reanalysis,
      new_status: reanalysis?.verdict === "approve" ? "approved" : (autoMode ? "draft" : "pending_review"),
    });
  } catch (e) {
    console.error("rework-artifact error:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro desconhecido");
  }
});
