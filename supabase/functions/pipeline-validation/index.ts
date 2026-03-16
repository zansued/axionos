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
 * Optimized: Static + Runtime analysis merged into single AI call to fit edge function timeout.
 * Fix Agent runs separately if needed (max 2 attempts).
 */

const MAX_FIX_ATTEMPTS = 2;
const APPROVAL_THRESHOLD = 70;

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-validation");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const jobId = await createJob(ctx, "validation", { initiative_id: ctx.initiativeId, mode: "fix_loop_bg", trace_id: crypto.randomUUID() });
  let currentExecutionProgress = initiative.execution_progress && typeof initiative.execution_progress === "object"
    ? initiative.execution_progress as Record<string, unknown>
    : {};
  const persistExecutionProgress = async (patch: Record<string, unknown>) => {
    currentExecutionProgress = await mergeExecutionProgress(serviceClient, ctx.initiativeId, currentExecutionProgress, patch);
  };

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

  const { data: initiativeArtifacts } = await serviceClient.from("agent_outputs")
    .select("id, type, summary, raw_output, agent_id, tokens_used, model_used, status, subtask_id, cost_estimate, agents(name, role)")
    .eq("organization_id", ctx.organizationId)
    .eq("initiative_id", ctx.initiativeId);

  const subtaskIdSet = new Set(subtaskIds);
  const artifacts = (initiativeArtifacts || []).filter((artifact: any) => {
    if (subtaskIds.length === 0) return true;
    return !artifact.subtask_id || subtaskIdSet.has(artifact.subtask_id);
  });

  if (!artifacts || artifacts.length === 0) {
    await persistExecutionProgress({
      status: "completed",
      current_stage: "validation",
      current_file: null,
      current_agent: null,
      current_subtask_id: null,
      current_subtask_description: null,
      validation: {
        status: "completed",
        total_artifacts: 0,
        approved: 0,
        escalated: 0,
        remaining: 0,
        current_artifact_id: null,
        current_artifact_summary: null,
        current_subtask_id: null,
        current_phase: "no_artifacts",
        last_error: "Nenhum artefato encontrado — execute o pipeline primeiro",
      },
    });
    if (jobId) {
      await completeJob(
        ctx,
        jobId,
        {
          artifacts_validated: 0,
          passed: 0,
          failed: 0,
          fixed: 0,
          pending_review: 0,
          remaining_to_validate: 0,
          overall_pass: false,
          skipped: "no_artifacts",
        },
        { model: "none", costUsd: 0, durationMs: 0 }
      );
    }
    return jsonResponse({
      success: true,
      artifacts_validated: 0,
      overall_pass: false,
      remaining_to_validate: 0,
      message: "Nenhum artefato encontrado — execute o pipeline primeiro",
      job_id: jobId,
    });
  }

  const artifactsToValidate = artifacts.filter((a: any) => a.status !== "approved" && a.status !== "pending_review");
  const total = artifacts.length;
  const alreadyApproved = artifacts.filter((a: any) => a.status === "approved").length;
  const alreadyEscalated = artifacts.filter((a: any) => a.status === "pending_review").length;

  // All already processed (approved or escalated) -> done
  if (artifactsToValidate.length === 0) {
    const overallPass = alreadyApproved === total;
    await updateInitiative(ctx, { stage_status: "ready_to_publish" });
    await persistExecutionProgress({
      status: "completed",
      current_stage: "validation",
      current_file: null,
      current_agent: null,
      current_subtask_id: null,
      current_subtask_description: null,
      validation: {
        status: "completed",
        total_artifacts: total,
        approved: alreadyApproved,
        escalated: alreadyEscalated,
        remaining: 0,
        current_artifact_id: null,
        current_artifact_summary: null,
        current_subtask_id: null,
        current_phase: "completed",
        last_error: null,
      },
    });
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
  await persistExecutionProgress({
    status: "running",
    current_stage: "validation",
    current_file: null,
    current_agent: "fix_loop",
    current_subtask_id: artifact.subtask_id || null,
    current_subtask_description: artifact.summary || null,
    validation: {
      status: "running",
      total_artifacts: total,
      approved: alreadyApproved,
      escalated: alreadyEscalated,
      remaining: artifactsToValidate.length,
      current_artifact_id: artifact.id,
      current_artifact_summary: artifact.summary || null,
      current_subtask_id: artifact.subtask_id || null,
      current_phase: "queued",
      current_attempt: 0,
      max_attempts: MAX_FIX_ATTEMPTS,
      last_error: null,
      last_issue_summary: null,
    },
  });

  try {
    await processOneArtifact(artifact, {
      user, initiative, ctx, serviceClient, apiKey,
      onProgress: async (validationPatch: Record<string, unknown>) => {
        await persistExecutionProgress({
          status: "running",
          current_stage: "validation",
          current_file: null,
          current_agent: "fix_loop",
          current_subtask_id: artifact.subtask_id || null,
          current_subtask_description: artifact.summary || null,
          validation: validationPatch,
        });
      },
    });

    // After processing, check overall status
    const safeSubtaskIds = subtaskIds.length > 0 ? subtaskIds : ["__none__"];
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
    await persistExecutionProgress({
      status: allProcessed ? "completed" : "running",
      current_stage: "validation",
      current_file: null,
      current_agent: allProcessed ? null : "fix_loop",
      current_subtask_id: allProcessed ? null : artifact.subtask_id || null,
      current_subtask_description: allProcessed ? null : artifact.summary || null,
      validation: {
        status: allProcessed ? "completed" : "running",
        total_artifacts: finalArtifacts.length,
        approved: approvedCount,
        escalated: escalatedCount,
        remaining: remainingCount,
        current_artifact_id: allProcessed ? null : artifact.id,
        current_artifact_summary: allProcessed ? null : artifact.summary || null,
        current_subtask_id: allProcessed ? null : artifact.subtask_id || null,
        current_phase: allProcessed ? "completed" : "awaiting_next_artifact",
        last_processed_artifact_id: artifact.id,
        last_result: overallPass ? "approved" : escalatedCount > 0 ? "needs_review" : "in_progress",
        last_error: null,
      },
    });

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
      `Validated 1 artifact (${artifact.summary?.slice(0, 40)}). ${approvedCount}/${finalArtifacts.length} approved, ${escalatedCount} escalated. ${allProcessed ? "ALL PROCESSED" : "More pending..."}`,
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
    await persistExecutionProgress({
      status: "running",
      current_stage: "validation",
      current_file: null,
      current_agent: "fix_loop",
      current_subtask_id: artifact.subtask_id || null,
      current_subtask_description: artifact.summary || null,
      validation: {
        status: "running",
        current_artifact_id: artifact.id,
        current_artifact_summary: artifact.summary || null,
        current_subtask_id: artifact.subtask_id || null,
        current_phase: "failed",
        last_error: e.message || "Validation processing error",
      },
    });
    if (jobId) await failJob(ctx, jobId, e.message || "Validation processing error");
    return errorResponse(e.message || "Validation processing error", 500);
  }
});

// ======================================================
// Process ONE artifact through the fix loop
// Optimized: Static + Runtime merged into single AI call
// ======================================================
async function processOneArtifact(artifact: any, deps: any) {
  const { user, initiative, ctx, serviceClient, apiKey, onProgress } = deps;
  const isCode = artifact.type === "code";
  let currentText = extractText(artifact.raw_output);
  let fixAttempts = 0;
  // Sprint 203: Generate attempt_id per fix loop iteration for traceability
  const fixLoopTraceId = crypto.randomUUID();

  // Get architecture context (light)
  let archContext = "";
  if (initiative.architecture_content) {
    archContext = String(initiative.architecture_content).slice(0, 1200);
  }

  for (let loop = 0; loop <= MAX_FIX_ATTEMPTS; loop++) {
    const isFirstPass = loop === 0;
    const attemptId = crypto.randomUUID();
    const attemptStartMs = Date.now();

    // Sprint 203: Structured Fix Loop log — entry
    await pipelineLog(ctx, "fix_loop_entry", `Fix Loop entry: artifact=${artifact.id}, loop=${loop}, attempt_id=${attemptId}`, {
      artifact_id: artifact.id, loop, attempt_id: attemptId, fix_loop_trace_id: fixLoopTraceId,
      phase: isFirstPass ? "analysis" : "reanalysis", subtask_id: artifact.subtask_id,
    });

    await onProgress?.({
      current_artifact_id: artifact.id,
      current_artifact_summary: artifact.summary || null,
      current_subtask_id: artifact.subtask_id || null,
      current_phase: isFirstPass ? "analysis" : "reanalysis",
      current_attempt: loop,
      max_attempts: MAX_FIX_ATTEMPTS,
      last_error: null,
      attempt_id: attemptId,
      fix_loop_trace_id: fixLoopTraceId,
    });

    // ═══ MERGED: Static Analysis (Agent 15) + Runtime QA (Agent 16) in ONE call ═══
    const combinedResult = await callAI(apiKey,
      `You are a combined Static Analysis + Runtime QA validator. ${!isFirstPass ? `Re-validation #${loop} after fix.` : ""}

Analyze for: Lint, Types, Imports, Complexity, Patterns, Security, Performance, Resilience.
${archContext ? `\nArchitecture context:\n${archContext.slice(0, 800)}` : ""}

Return ONLY JSON:
{
  "static_score": 0-100,
  "runtime_score": 0-100,
  "issues": [{"severity": "error|warning|info", "category": "string", "message": "string", "suggestion": "string"}],
  "security_issues": [],
  "performance_issues": [],
  "imports_valid": true,
  "type_safety_score": 0-100,
  "resilience_score": 0-100,
  "summary": "string"
}`,
      `Artifact: ${artifact.summary || "N/A"} (${artifact.type}, Loop ${loop}/${MAX_FIX_ATTEMPTS})\n\n${currentText.slice(0, 5000)}`,
      true
    );

    let analysis: any;
    try { analysis = extractJsonFromResponse(combinedResult.content); }
    catch { analysis = { static_score: 60, runtime_score: 60, issues: [], security_issues: [], performance_issues: [], summary: "Parse failed", imports_valid: true, type_safety_score: 60, resilience_score: 60 }; }

    await persistValidationRun(serviceClient, artifact.id, isFirstPass ? "combined_analysis" : `combined_revalidation_${loop}`, analysis, combinedResult.durationMs);
    if (isFirstPass) await persistReview(serviceClient, artifact.id, user.id, "combined_analysis", artifact.status, JSON.stringify(analysis));

    // Sprint 203: Structured Fix Loop log — analysis result
    const analysisElapsedMs = Date.now() - attemptStartMs;
    await pipelineLog(ctx, "fix_loop_analysis", `Fix Loop analysis: score=${analysis.static_score}/${analysis.runtime_score}, issues=${(analysis.issues || []).length}`, {
      artifact_id: artifact.id, loop, attempt_id: attemptId, fix_loop_trace_id: fixLoopTraceId,
      static_score: analysis.static_score, runtime_score: analysis.runtime_score,
      issues_count: (analysis.issues || []).length, security_issues: (analysis.security_issues || []).length,
      elapsed_ms: analysisElapsedMs, subtask_id: artifact.subtask_id,
      issue_categories: (analysis.issues || []).map((i: any) => i.category).filter(Boolean),
    });

    // Combined score
    const staticScore = analysis.static_score || 60;
    const runtimeScore = analysis.runtime_score || 60;
    const combinedScore = Math.round((staticScore + runtimeScore) / 2);
    const blockingIssues = [
      ...(analysis.issues || []).filter((i: any) => i.severity !== "info").map((i: any) => `[${i.category}] ${i.message}`),
      ...(analysis.security_issues || []).map((s: string) => `[security] ${s}`),
    ];
    const hasErrors = (analysis.issues || []).some((i: any) => i.severity === "error");
    const hasSecurityIssues = (analysis.security_issues || []).length > 0;
    const passes = combinedScore >= APPROVAL_THRESHOLD && !hasErrors && !hasSecurityIssues;
    const issueSummary = blockingIssues[0] || analysis.summary || null;

    await onProgress?.({
      current_artifact_id: artifact.id,
      current_artifact_summary: artifact.summary || null,
      current_subtask_id: artifact.subtask_id || null,
      current_phase: passes ? "approved" : loop === MAX_FIX_ATTEMPTS ? "escalated" : "fixing",
      current_attempt: fixAttempts,
      max_attempts: MAX_FIX_ATTEMPTS,
      combined_score: combinedScore,
      issues_count: blockingIssues.length,
      last_issue_summary: issueSummary,
      last_error: null,
    });

    if (passes) {
      // Run security matcher on artifact content for leak detection
      const matchInput: MatchInput = { status_code: 200, body: currentText.slice(0, 10000) };
      const secReport = evaluateSecurityRules(PIPELINE_SECURITY_RULES, matchInput);
      if (!secReport.passed) {
        const logEntry = buildMatcherLogEntry("pipeline-validation", secReport);
        await pipelineLog(ctx, "security_matcher_alert",
          `Security matcher flagged artifact ${artifact.id}: ${logEntry.matched_rule_ids.join(", ")}`, logEntry as unknown as Record<string, unknown>);
      }

      await serviceClient.from("agent_outputs").update({ status: "approved" }).eq("id", artifact.id);
      await persistReview(serviceClient, artifact.id, user.id, "auto_approved", artifact.status,
        `${isFirstPass ? "Approved" : `Approved after ${fixAttempts} fix(es)`}. Score: ${combinedScore}/100${!secReport.passed ? ` [security: ${secReport.highest_severity}]` : ""}`);
      await pipelineLog(ctx, "artifact_auto_approved", `${artifact.summary?.slice(0, 40)} approved (${combinedScore}/100, ${fixAttempts} fixes)`);
      return;
    }

    // Last attempt -> escalate
    if (loop === MAX_FIX_ATTEMPTS) {
      await serviceClient.from("agent_outputs").update({ status: "pending_review" }).eq("id", artifact.id);
      await persistReview(serviceClient, artifact.id, user.id, "escalated_to_human", artifact.status,
        `Escalated after ${MAX_FIX_ATTEMPTS} attempts. Score: ${combinedScore}/100`);
      await pipelineLog(ctx, "artifact_escalated", `${artifact.summary?.slice(0, 40)} escalated (${combinedScore}/100)`);
      return;
    }

    // ═══ AGENT 17: Fix Agent ═══
    fixAttempts++;
    const allIssues = blockingIssues.slice(0, 10).join("\n");
    await onProgress?.({
      current_artifact_id: artifact.id,
      current_artifact_summary: artifact.summary || null,
      current_subtask_id: artifact.subtask_id || null,
      current_phase: "fixing",
      current_attempt: fixAttempts,
      max_attempts: MAX_FIX_ATTEMPTS,
      combined_score: combinedScore,
      issues_count: blockingIssues.length,
      last_issue_summary: issueSummary,
      last_error: null,
    });

    const fixResult = await callAI(apiKey,
      `You are the "Fix Agent" (Agent 17). Attempt ${fixAttempts}/${MAX_FIX_ATTEMPTS}.
Fix ALL issues. Return the COMPLETE corrected artifact, no markdown wrapping.`,
      `## Artifact (score: ${combinedScore}/100)\n${currentText.slice(0, 5000)}\n\n## Issues\n${allIssues}\n\nReturn the COMPLETE corrected output.`
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
      artifact.status, `Fix attempt ${fixAttempts}/${MAX_FIX_ATTEMPTS}. Score before: ${combinedScore}/100`);

    // Sprint 203: Structured Fix Loop log — fix result
    await pipelineLog(ctx, "fix_loop_fix_applied", `Fix Loop fix applied: attempt=${fixAttempts}, artifact=${artifact.id}`, {
      artifact_id: artifact.id, loop, attempt_id: attemptId, fix_loop_trace_id: fixLoopTraceId,
      fix_attempt: fixAttempts, score_before: combinedScore,
      issues_fixed: blockingIssues.length, subtask_id: artifact.subtask_id,
      elapsed_ms: Date.now() - attemptStartMs,
    });

    await pipelineLog(ctx, "fix_agent_attempt",
      `Fix #${fixAttempts} for ${artifact.summary?.slice(0, 40)} (score: ${combinedScore})`);
  }
}

// ── Helpers ──
async function mergeExecutionProgress(
  client: any,
  initiativeId: string,
  currentProgress: Record<string, unknown>,
  patch: Record<string, unknown>,
) {
  const base = currentProgress && typeof currentProgress === "object" ? currentProgress : {};
  const baseValidation = base.validation && typeof base.validation === "object"
    ? base.validation as Record<string, unknown>
    : {};
  const nextValidation = patch.validation && typeof patch.validation === "object"
    ? { ...baseValidation, ...(patch.validation as Record<string, unknown>) }
    : baseValidation;

  const next = {
    ...base,
    ...patch,
    validation: nextValidation,
  };

  await client.from("initiatives").update({ execution_progress: next }).eq("id", initiativeId);
  return next;
}

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
