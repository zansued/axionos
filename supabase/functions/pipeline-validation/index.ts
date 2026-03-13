import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, recordError, updateNodeStatus, getNodeByPath, markErrorFixed } from "../_shared/brain-helpers.ts";
import { evaluateSecurityRules, PIPELINE_SECURITY_RULES, buildMatcherLogEntry, type MatchInput } from "../_shared/contracts/security-matcher.schema.ts";

/**
 * Camada 5 — Verificação com Fix Loop Automático (Synchronous, One-at-a-time)
 * 
 * Processes ONE artifact per invocation synchronously.
 * Frontend retries automatically until all artifacts are validated.
 *
 * 3 agentes especializados + Fix Loop (max 2 tentativas):
 *   1. Static Analysis (Agente 15)
 *   2. Runtime QA     (Agente 16)
 *   3. Fix Agent      (Agente 17)
 */

const MAX_FIX_ATTEMPTS = 2;
const APPROVAL_THRESHOLD = 70;

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-validation");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const jobId = await createJob(ctx, "validation", { initiative_id: ctx.initiativeId, mode: "fix_loop_bg" });

  // Mark stale jobs as failed
  if (jobId) {
    await serviceClient.from("initiative_jobs").update({
      status: "failed", error: "Superseded by new validation run.",
      completed_at: new Date().toISOString(),
    }).eq("initiative_id", ctx.initiativeId).eq("stage", "validation").eq("status", "running").neq("id", jobId);
  }

  // ── Collect artifacts to find what needs validation ──
  const { data: stories } = await serviceClient.from("stories").select("id").eq("initiative_id", ctx.initiativeId);
  if (!stories || stories.length === 0) {
    if (jobId) await failJob(ctx, jobId, "Nenhuma story encontrada");
    return errorResponse("Nenhuma story encontrada");
  }

  const storyIds = stories.map((s: any) => s.id);
  const { data: phases } = await serviceClient.from("story_phases").select("id").in("story_id", storyIds);
  const phaseIds = (phases || []).map((p: any) => p.id);
  const { data: subtasks } = await serviceClient.from("story_subtasks").select("id").in("phase_id", phaseIds);
  const subtaskIds = (subtasks || []).map((st: any) => st.id);

  const safeSubtaskIds = subtaskIds.length > 0 ? subtaskIds : ["00000000-0000-0000-0000-000000000000"];

  const { data: artifacts } = await serviceClient.from("agent_outputs")
    .select("id, type, summary, raw_output, agent_id, tokens_used, model_used, status, subtask_id, cost_estimate, agents(name, role)")
    .in("subtask_id", safeSubtaskIds)
    .eq("organization_id", ctx.organizationId);

  if (!artifacts || artifacts.length === 0) {
    if (jobId) await failJob(ctx, jobId, "Nenhum artefato encontrado");
    return errorResponse("Nenhum artefato encontrado para validar");
  }

  const artifactsToValidate = artifacts.filter((a: any) => a.status !== "approved" && a.status !== "pending_review");
  const total = artifacts.length;
  const alreadyApproved = artifacts.filter((a: any) => a.status === "approved").length;
  const alreadyEscalated = artifacts.filter((a: any) => a.status === "pending_review").length;

  // All already processed (approved or escalated) → done
  if (artifactsToValidate.length === 0) {
    const overallPass = alreadyApproved === total;
    await updateInitiative(ctx, { stage_status: "ready_to_publish" });
    if (jobId) await completeJob(ctx, jobId, {
      artifacts_validated: total, passed: alreadyApproved, failed: 0, fixed: 0,
      escalated: alreadyEscalated,
      remaining_to_validate: 0, batch_incomplete: false, overall_pass: overallPass,
      skipped: "all_already_processed",
    }, { model: "routed", costUsd: 0, durationMs: 0 });
    return jsonResponse({ success: true, overall_pass: overallPass, remaining_to_validate: 0, job_id: jobId });
  }

  // Pick ONE artifact to process synchronously
  const artifact = artifactsToValidate[0];
  const remaining = artifactsToValidate.length - 1;

  try {
    await processOneArtifact(artifact, {
      user, initiative, ctx, serviceClient, apiKey, safeSubtaskIds,
    });

    // After processing, check overall status
    const { data: artifactsAfter } = await serviceClient.from("agent_outputs")
      .select("id, status")
      .in("subtask_id", safeSubtaskIds)
      .eq("organization_id", ctx.organizationId);

    const finalArtifacts = artifactsAfter || artifacts;
    const approvedCount = finalArtifacts.filter((a: any) => a.status === "approved").length;
    const escalatedCount = finalArtifacts.filter((a: any) => a.status === "pending_review").length;
    const remainingCount = finalArtifacts.length - approvedCount - escalatedCount;
    const overallPass = approvedCount === finalArtifacts.length;
    const allProcessed = remainingCount === 0;

    await updateInitiative(ctx, { stage_status: allProcessed ? "ready_to_publish" : "validating" });

    if (jobId) await completeJob(ctx, jobId, {
      artifacts_validated: finalArtifacts.length,
      processed_artifact: artifact.id,
      passed: approvedCount,
      escalated: escalatedCount,
      remaining_to_validate: remainingCount,
      batch_incomplete: !allProcessed,
      overall_pass: overallPass,
    }, { model: "routed", costUsd: 0, durationMs: 0 });

    await pipelineLog(ctx, "pipeline_validation_batch_done",
      `Validated 1 artifact (${artifact.summary?.slice(0, 40)}). ${approvedCount}/${finalArtifacts.length} approved, ${escalatedCount} escalated. ${allProcessed ? "ALL PROCESSED ✅" : "More pending..."}`,
    );

    return jsonResponse({
      success: true,
      artifact_id: artifact.id,
      already_approved: alreadyApproved + approvedCount - artifacts.filter((a: any) => a.status === "approved").length,
      remaining_to_validate: remainingCount,
      batch_incomplete: !allProcessed,
      overall_pass: overallPass,
      total: finalArtifacts.length,
      job_id: jobId,
    });
  } catch (e: any) {
    console.error("pipeline-validation error:", e);
    if (jobId) await failJob(ctx, jobId, e.message || "Validation processing error");
    return errorResponse(e.message || "Validation processing error", 500);
  }
});

// ══════════════════════════════════════════════════
// Process ONE artifact through the fix loop
// ══════════════════════════════════════════════════
async function processOneArtifact(artifact: any, deps: any) {
  const { user, initiative, ctx, serviceClient, apiKey } = deps;
  const agentName = artifact.agents?.name || "?";
  const isCode = artifact.type === "code";
  let currentText = extractText(artifact.raw_output);
  let fixAttempts = 0;
  let lastCombinedScore = 0;

  // Get architecture context (light)
  let archContext = "";
  if (initiative.architecture_content) {
    archContext = String(initiative.architecture_content).slice(0, 1500);
  }

  for (let loop = 0; loop <= MAX_FIX_ATTEMPTS; loop++) {
    const isFirstPass = loop === 0;

    // ═══ AGENT 15: Static Analysis ═══
    const staticResult = await callAI(apiKey,
      `Você é o agente "Static Analysis" (Agente 15). ${!isFirstPass ? `Re-validação #${loop} após correção.` : ""}
Analise quanto a: Lint, Tipos, Imports, Complexidade, Padrões.
${archContext ? `\nContexto Arquitetural:\n${archContext.slice(0, 800)}` : ""}

Retorne APENAS JSON:
{"static_score": 0-100, "issues": [{"severity": "error|warning|info", "category": "string", "message": "string", "suggestion": "string"}], "summary": "string", "imports_valid": true, "type_safety_score": 0-100, "complexity_score": 0-100}`,
      `Artefato: ${artifact.summary || "N/A"} (${artifact.type}, Loop ${loop}/${MAX_FIX_ATTEMPTS})\n\n${currentText.slice(0, 4000)}`,
      true
    );

    let staticAnalysis: any;
    try { staticAnalysis = extractJsonFromResponse(staticResult.content); }
    catch { staticAnalysis = { static_score: 60, issues: [], summary: "Parse failed", imports_valid: true, type_safety_score: 60, complexity_score: 60 }; }

    await persistValidationRun(serviceClient, artifact.id, isFirstPass ? "static_analysis" : `static_revalidation_${loop}`, staticAnalysis, staticResult.durationMs);
    if (isFirstPass) await persistReview(serviceClient, artifact.id, user.id, "static_analysis", artifact.status, JSON.stringify(staticAnalysis));

    // ═══ AGENT 16: Runtime QA ═══
    const runtimeResult = await callAI(apiKey,
      `Você é o agente "Runtime QA" (Agente 16). ${!isFirstPass ? `Re-validação #${loop}.` : ""}
Analise: cenários de teste, segurança, performance, resiliência.

Retorne APENAS JSON:
{"runtime_score": 0-100, "test_scenarios": [{"name": "string", "type": "happy|edge|error|security", "risk": "low|medium|high"}], "security_issues": [], "performance_issues": [], "resilience_score": 0-100, "summary": "string"}`,
      `Artefato: ${artifact.summary || "N/A"} (${artifact.type}, Loop ${loop})\nStatic Issues: ${JSON.stringify((staticAnalysis.issues || []).slice(0, 5))}\n\n${currentText.slice(0, 4000)}`,
      true
    );

    let runtimeQA: any;
    try { runtimeQA = extractJsonFromResponse(runtimeResult.content); }
    catch { runtimeQA = { runtime_score: 60, test_scenarios: [], security_issues: [], performance_issues: [], resilience_score: 60, summary: "Parse failed" }; }

    await persistValidationRun(serviceClient, artifact.id, isFirstPass ? "runtime_qa" : `runtime_revalidation_${loop}`, runtimeQA, runtimeResult.durationMs);

    // Combined score
    const combinedScore = Math.round(((staticAnalysis.static_score || 0) + (runtimeQA.runtime_score || 0)) / 2);
    lastCombinedScore = combinedScore;
    const hasErrors = (staticAnalysis.issues || []).some((i: any) => i.severity === "error");
    const hasSecurityIssues = (runtimeQA.security_issues || []).length > 0;
    const passes = combinedScore >= APPROVAL_THRESHOLD && !hasErrors && !hasSecurityIssues;

    if (passes) {
      // Run security matcher on artifact content for leak detection
      const matchInput: MatchInput = { status_code: 200, body: currentText.slice(0, 10000) };
      const secReport = evaluateRules(PIPELINE_SECURITY_RULES, matchInput);
      if (!secReport.passed) {
        await pipelineLog(ctx, "security_matcher_alert",
          `⚠️ Security matcher flagged artifact ${artifact.id}: ${secReport.results.filter(r => r.matched).map(r => r.rule_name).join(", ")}`);
      }

      await serviceClient.from("agent_outputs").update({ status: "approved" }).eq("id", artifact.id);
      await persistReview(serviceClient, artifact.id, user.id, "auto_approved", artifact.status,
        `${isFirstPass ? "Aprovado" : `Aprovado após ${fixAttempts} fix(es)`}. Score: ${combinedScore}/100${!secReport.passed ? ` [security: ${secReport.highest_severity}]` : ""}`);
      await pipelineLog(ctx, "artifact_auto_approved", `✅ ${artifact.summary?.slice(0, 40)} approved (${combinedScore}/100, ${fixAttempts} fixes)`);
      return;
    }

    // Last attempt → escalate
    if (loop === MAX_FIX_ATTEMPTS) {
      await serviceClient.from("agent_outputs").update({ status: "pending_review" }).eq("id", artifact.id);
      await persistReview(serviceClient, artifact.id, user.id, "escalated_to_human", artifact.status,
        `Escalado após ${MAX_FIX_ATTEMPTS} tentativas. Score: ${combinedScore}/100`);
      await pipelineLog(ctx, "artifact_escalated", `⚠️ ${artifact.summary?.slice(0, 40)} escalated (${combinedScore}/100)`);
      return;
    }

    // ═══ AGENT 17: Fix Agent ═══
    fixAttempts++;
    const allIssues = [
      ...(staticAnalysis.issues || []).filter((i: any) => i.severity !== "info").map((i: any) => `[${i.category}] ${i.message}`),
      ...(runtimeQA.security_issues || []).map((s: string) => `[security] ${s}`),
    ].slice(0, 10).join("\n");

    const fixResult = await callAI(apiKey,
      `Você é o "Fix Agent" (Agente 17). Tentativa ${fixAttempts}/${MAX_FIX_ATTEMPTS}.
Corrija TODOS os issues. Retorne o artefato COMPLETO corrigido, sem markdown wrapping.`,
      `## Artefato (score: ${combinedScore}/100)\n${currentText.slice(0, 5000)}\n\n## Issues\n${allIssues}\n\nRetorne o output COMPLETO corrigido.`
    );

    const fixedOutput = fixResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
    currentText = fixedOutput;

    const newRawOutput = isCode
      ? { ...(typeof artifact.raw_output === "object" ? artifact.raw_output : {}), content: fixedOutput, text: fixedOutput }
      : { text: fixedOutput };

    await serviceClient.from("agent_outputs").update({
      raw_output: newRawOutput,
      tokens_used: (artifact.tokens_used || 0) + fixResult.tokens,
      cost_estimate: Number(artifact.cost_estimate || 0) + fixResult.costUsd,
      updated_at: new Date().toISOString(),
    }).eq("id", artifact.id);

    await persistReview(serviceClient, artifact.id, user.id, "fix_agent",
      artifact.status, `Fix attempt ${fixAttempts}/${MAX_FIX_ATTEMPTS}. Score antes: ${combinedScore}/100`);

    await pipelineLog(ctx, "fix_agent_attempt",
      `🔧 Fix #${fixAttempts} for ${artifact.summary?.slice(0, 40)} (score: ${combinedScore})`);
  }
}

// ── Helpers ──
function extractJsonFromResponse(response: string): unknown {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.search(/[\{\[]/);
  const jsonEnd = cleaned.lastIndexOf(jsonStart !== -1 && cleaned[jsonStart] === '[' ? ']' : '}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON object found in response");
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
}

function extractText(raw: any): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") return raw?.text || raw?.content || JSON.stringify(raw);
  return String(raw);
}

async function persistValidationRun(client: any, artifactId: string, type: string, data: any, duration: number) {
  await client.from("validation_runs").insert({
    artifact_id: artifactId, type,
    result: (data.score || data.static_score || data.runtime_score || 0) >= 70 ? "pass" : "warning",
    logs: JSON.stringify(data), duration: duration || 0,
  });
}

async function persistReview(client: any, outputId: string, userId: string, action: string, prevStatus: string, comment: string) {
  await client.from("artifact_reviews").insert({
    output_id: outputId, reviewer_id: userId, action,
    previous_status: prevStatus, new_status: prevStatus, comment,
  });
}
