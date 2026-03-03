import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_REWORK_ITERATIONS = 3;

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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { allowed } = await checkRateLimit(user.id, "rework-artifact");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { artifactId, feedback, autoMode } = await req.json();
    if (!artifactId) throw new Error("artifactId is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      // Mark for human intervention
      await serviceClient.from("artifact_reviews").insert({
        output_id: artifactId,
        reviewer_id: user.id,
        action: "escalated_to_human",
        previous_status: artifact.status,
        new_status: "pending_review",
        comment: `Limite de ${MAX_REWORK_ITERATIONS} retrabalhos automáticos atingido. Escalado para revisão humana.`,
      });

      await serviceClient.from("agent_outputs")
        .update({ status: "pending_review" })
        .eq("id", artifactId);

      return new Response(JSON.stringify({
        success: true,
        escalated: true,
        message: `Limite de retrabalhos automáticos (${MAX_REWORK_ITERATIONS}) atingido. Artefato escalado para revisão humana.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the original subtask for context
    let subtaskContext = "";
    if (artifact.subtask_id) {
      const { data: subtask } = await serviceClient
        .from("story_subtasks")
        .select("description, story_phases(name, stories(title, description))")
        .eq("id", artifact.subtask_id)
        .single();

      if (subtask) {
        const story = (subtask as any).story_phases?.stories;
        subtaskContext = `
## Contexto Original
- **Story**: ${story?.title || "N/A"}
- **Descrição da Story**: ${story?.description || "N/A"}
- **Fase**: ${(subtask as any).story_phases?.name || "N/A"}
- **Subtask**: ${subtask.description}`;
      }
    }

    const agent = artifact.agents;
    const previousOutput = typeof artifact.raw_output === "object" && artifact.raw_output !== null && "text" in (artifact.raw_output as any)
      ? String((artifact.raw_output as any).text)
      : JSON.stringify(artifact.raw_output);

    // Get all review feedback for context
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

    const systemPrompt = `Você é o agente "${agent?.name || "Unknown"}" com o papel de "${agent?.role || "N/A"}" no AxionOS.
${agent?.description ? `Descrição: ${agent.description}` : ""}

Você está fazendo um RETRABALHO de um artefato que recebeu feedback. Corrija TODOS os problemas apontados e incorpore TODAS as sugestões aplicáveis.

Regras:
1. Mantenha o que estava bom no output anterior
2. Corrija especificamente os problemas apontados  
3. Incorpore as sugestões que fazem sentido técnico
4. Produza um output COMPLETO e revisado (não apenas as correções)
5. Responda em português do Brasil`;

    const userPrompt = `${subtaskContext}

## Output Anterior (a ser corrigido)
\`\`\`
${previousOutput.substring(0, 6000)}
\`\`\`

## Feedback Recebido
${feedback || feedbackHistory || "Corrigir problemas identificados na análise."}

## Histórico de Revisões
${feedbackHistory}

---

Produza o output COMPLETO e revisado, corrigindo todos os problemas apontados.`;

    // Execute rework with AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
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
    const newOutput = aiData.choices?.[0]?.message?.content;
    const tokensUsed = aiData.usage?.total_tokens || 0;

    if (!newOutput) throw new Error("IA não retornou output");

    // Update artifact with new output
    await serviceClient.from("agent_outputs").update({
      raw_output: { text: newOutput, model_response: aiData, previous_version: artifact.raw_output },
      tokens_used: (artifact.tokens_used || 0) + tokensUsed,
      cost_estimate: Number(artifact.cost_estimate || 0) + (tokensUsed * 0.000001),
      model_used: "google/gemini-2.5-flash",
      status: autoMode ? "draft" : "pending_review",
      updated_at: new Date().toISOString(),
    }).eq("id", artifactId);

    // Update subtask output if linked
    if (artifact.subtask_id) {
      await serviceClient.from("story_subtasks").update({
        output: newOutput,
        executed_at: new Date().toISOString(),
      }).eq("id", artifact.subtask_id);
    }

    // Record rework in reviews
    await serviceClient.from("artifact_reviews").insert({
      output_id: artifactId,
      reviewer_id: user.id,
      action: "auto_rework",
      previous_status: artifact.status,
      new_status: autoMode ? "draft" : "pending_review",
      comment: JSON.stringify({
        iteration: (reworkCount || 0) + 1,
        max_iterations: MAX_REWORK_ITERATIONS,
        tokens_used: tokensUsed,
        trigger: autoMode ? "automatic" : "manual",
        feedback_summary: (feedback || "Baseado em análise IA").substring(0, 500),
      }),
    });

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "artifact_reworked",
      category: "execution",
      entity_type: "agent_outputs",
      entity_id: artifactId,
      message: `Artefato retrabalhado (iteração ${(reworkCount || 0) + 1}/${MAX_REWORK_ITERATIONS}) por @${agent?.name || "unknown"} - ${autoMode ? "AUTOMÁTICO" : "MANUAL"}`,
      severity: "info",
      metadata: { 
        agent_id: agent?.id, 
        iteration: (reworkCount || 0) + 1,
        auto_mode: autoMode,
        tokens_used: tokensUsed,
      },
    });

    // If auto mode, trigger re-analysis
    let reanalysis = null;
    if (autoMode) {
      try {
        const analyzeResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-artifact`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
          },
          body: JSON.stringify({ artifactId }),
        });

        if (analyzeResp.ok) {
          const analyzeData = await analyzeResp.json();
          reanalysis = analyzeData.analysis;

          // If approved, update status
          if (reanalysis?.verdict === "approve") {
            await serviceClient.from("agent_outputs")
              .update({ status: "approved" })
              .eq("id", artifactId);

            await serviceClient.from("artifact_reviews").insert({
              output_id: artifactId,
              reviewer_id: user.id,
              action: "auto_approved",
              previous_status: "draft",
              new_status: "approved",
              comment: `Aprovado automaticamente pela IA após retrabalho (iteração ${(reworkCount || 0) + 1}). Confiança: ${reanalysis.confidence}%`,
            });
          }
          // If still needs changes and under limit, return info for client to decide
        }
      } catch (err) {
        console.error("Auto re-analysis failed:", err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      iteration: (reworkCount || 0) + 1,
      max_iterations: MAX_REWORK_ITERATIONS,
      tokens_used: tokensUsed,
      auto_mode: autoMode,
      reanalysis,
      new_status: reanalysis?.verdict === "approve" ? "approved" : (autoMode ? "draft" : "pending_review"),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rework-artifact error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
