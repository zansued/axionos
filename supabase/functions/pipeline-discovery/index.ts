import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-discovery");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "discovery", {
    title: initiative.title,
    description: initiative.description,
    reference_url: initiative.reference_url,
  });
  await updateInitiative(ctx, { stage_status: "discovering" });
  await pipelineLog(ctx, "pipeline_discovery_start", "Iniciando descoberta inteligente...");

  try {
    // Scrape reference URL if provided
    let referenceContent = "";
    if (initiative.reference_url) {
      const selfHostedUrl = Deno.env.get("FIRECRAWL_SELF_HOSTED_URL");
      const selfHostedKey = Deno.env.get("FIRECRAWL_SELF_HOSTED_KEY");
      const cloudKey = Deno.env.get("FIRECRAWL_API_KEY");
      const firecrawlBaseUrl = selfHostedUrl || "https://api.firecrawl.dev";
      const firecrawlApiKey = selfHostedUrl ? selfHostedKey : cloudKey;

      if (firecrawlApiKey) {
        try {
          console.log("Scraping reference URL:", initiative.reference_url, "via", selfHostedUrl ? "self-hosted" : "cloud");
          const scrapeResp = await fetch(`${firecrawlBaseUrl}/v1/scrape`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: initiative.reference_url,
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          });
          if (scrapeResp.ok) {
            const scrapeData = await scrapeResp.json();
            const md = scrapeData?.data?.markdown || scrapeData?.markdown || "";
            referenceContent = md.slice(0, 8000);
            console.log(`Scraped ${referenceContent.length} chars from reference URL`);
          } else {
            console.warn("Firecrawl scrape failed:", scrapeResp.status);
          }
        } catch (scrapeErr) {
          console.warn("Firecrawl scrape error:", scrapeErr);
        }
      }
    }

    const referenceBlock = referenceContent
      ? `\n\nSITE DE REFERÊNCIA (${initiative.reference_url}):\n---\n${referenceContent}\n---\nUse este site como inspiração e referência para a análise. Identifique funcionalidades, estrutura, público-alvo e modelo de negócio com base no conteúdo do site.`
      : "";

    const aiResult = await callAI(
      apiKey,
      `Você é um consultor de produto e estratégia sênior. Analise a ideia do usuário e produza uma descoberta inteligente completa. Retorne APENAS JSON válido.`,
      `Ideia do usuário: "${initiative.title}"
${initiative.description ? `Descrição: ${initiative.description}` : ""}${referenceBlock}

Produza uma análise completa no seguinte formato JSON:
{
  "refined_idea": "Versão refinada e expandida da ideia original (2-3 parágrafos)",
  "business_model": "Modelo de negócio sugerido com justificativa",
  "mvp_scope": "Definição clara do MVP",
  "complexity": "low|medium|high|critical",
  "risk_level": "low|medium|high|critical",
  "suggested_stack": "Stack tecnológica sugerida",
  "strategic_vision": "Visão estratégica em 3 horizontes",
  "market_analysis": "Análise de mercado e concorrentes",
  "feasibility_analysis": "Análise de viabilidade técnica e de negócio",
  "target_user": "Público-alvo principal",
  "initial_estimate": {
    "effort_weeks": 0,
    "team_size": 0,
    "estimated_stories": 0,
    "complexity_score": 0
  }
}`,
      true
    );

    const discovery = JSON.parse(aiResult.content);
    await updateInitiative(ctx, {
      stage_status: "discovered",
      idea_raw: initiative.description || initiative.title,
      refined_idea: discovery.refined_idea?.slice(0, 500),
      business_model: discovery.business_model?.slice(0, 300),
      mvp_scope: discovery.mvp_scope?.slice(0, 300),
      complexity: discovery.complexity,
      risk_level: discovery.risk_level,
      target_user: discovery.target_user,
      discovery_payload: { ...discovery, reference_url: initiative.reference_url, reference_scraped: !!referenceContent },
    });

    if (jobId) await completeJob(ctx, jobId, discovery, { model: aiResult.model, costUsd: aiResult.costUsd, durationMs: aiResult.durationMs });
    await pipelineLog(ctx, "pipeline_discovery_complete", "Descoberta inteligente concluída", { tokens: aiResult.tokens, cost_usd: aiResult.costUsd, reference_scraped: !!referenceContent });

    return jsonResponse({ success: true, discovery, tokens: aiResult.tokens, job_id: jobId });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "draft" });
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
