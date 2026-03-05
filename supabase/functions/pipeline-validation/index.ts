import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-validation");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const jobId = await createJob(ctx, "validation", { initiative_id: ctx.initiativeId, mode: "batched" });

  // Mark stale validation jobs as failed
  if (jobId) {
    await serviceClient.from("initiative_jobs").update({
      status: "failed", error: "Execução interrompida antes de finalizar (timeout/redeploy).",
      completed_at: new Date().toISOString(),
    }).eq("initiative_id", ctx.initiativeId).eq("stage", "validation").eq("status", "running").neq("id", jobId);
  }

  await pipelineLog(ctx, "pipeline_validation_start", "Iniciando validação de qualidade dos artefatos...");

  try {
    const { data: stories } = await serviceClient.from("stories").select("id").eq("initiative_id", ctx.initiativeId);
    if (!stories || stories.length === 0) throw new Error("Nenhuma story encontrada");

    const storyIds = stories.map((s: any) => s.id);
    const { data: phases } = await serviceClient.from("story_phases").select("id").in("story_id", storyIds);
    const phaseIds = (phases || []).map((p: any) => p.id);
    const { data: subtasks } = await serviceClient.from("story_subtasks").select("id").in("phase_id", phaseIds);
    const subtaskIds = (subtasks || []).map((st: any) => st.id);

    const { data: artifacts } = await serviceClient.from("agent_outputs")
      .select("id, type, summary, raw_output, agent_id, tokens_used, model_used, status, subtask_id, cost_estimate, agents(name, role)")
      .in("subtask_id", subtaskIds.length > 0 ? subtaskIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("organization_id", ctx.organizationId);

    if (!artifacts || artifacts.length === 0) throw new Error("Nenhum artefato encontrado para validar");

    const artifactsToValidate = artifacts.filter((a: any) => a.status !== "approved");
    const VALIDATION_BATCH_SIZE = 8;
    const artifactsBatch = artifactsToValidate.slice(0, VALIDATION_BATCH_SIZE);

    if (artifactsToValidate.length === 0) {
      await updateInitiative(ctx, { stage_status: "ready_to_publish" });
      if (jobId) await completeJob(ctx, jobId, {
        artifacts_validated: artifacts.length, passed: artifacts.length, failed: 0, reworked: 0,
        auto_approved: 0, auto_rejected: 0, warnings: 0, remaining_to_validate: 0,
        batch_incomplete: false, overall_pass: true, skipped: "all_already_approved",
      }, { model: "google/gemini-2.5-flash", costUsd: 0, durationMs: 0 });
      return jsonResponse({
        success: true, artifacts_validated: artifacts.length, passed: artifacts.length,
        failed: 0, reworked: 0, auto_approved: 0, auto_rejected: 0, warnings: 0,
        remaining_to_validate: 0, batch_incomplete: false, overall_pass: true, job_id: jobId,
      });
    }

    let totalTokens = 0, totalCost = 0, passCount = 0, failCount = 0, reworkedCount = 0;
    let autoApprovedCount = 0, autoRejectedCount = 0;
    const validationResults: any[] = [];
    const MAX_REWORK_ATTEMPTS = 2;
    const APPROVAL_THRESHOLD = 70;
    const REWORK_THRESHOLD = 50;

    // Fetch architect for cross-review
    let architectAgentForReview: any = null;
    const { data: squadsForReview } = await serviceClient.from("squads")
      .select("id, squad_members(role_in_squad, agents(id, name, role))")
      .eq("initiative_id", ctx.initiativeId).limit(1);
    if (squadsForReview?.[0]?.squad_members) {
      const archMember = squadsForReview[0].squad_members.find((sm: any) => sm.role_in_squad === "architect");
      architectAgentForReview = archMember?.agents || null;
    }

    for (const artifact of artifactsBatch) {
      let currentOutput = artifact.raw_output;
      let currentArtifactId = artifact.id;
      let finalValidation: any = null;
      let reworkAttempts = 0;

      for (let attempt = 0; attempt <= MAX_REWORK_ATTEMPTS; attempt++) {
        const artifactText = typeof currentOutput === "object"
          ? (currentOutput as any)?.text || (currentOutput as any)?.content || JSON.stringify(currentOutput)
          : String(currentOutput);

        const validationStart = Date.now();
        const aiResult = await callAI(apiKey,
          `Você é um revisor de qualidade sênior. Analise o artefato e avalie sua qualidade. Retorne APENAS JSON válido. Seja rigoroso mas justo.`,
          `## Artefato para validação\n- **Tipo**: ${artifact.type}\n- **Agente**: ${(artifact as any).agents?.name || "?"} (${(artifact as any).agents?.role || "?"})\n- **Resumo**: ${artifact.summary || "N/A"}\n${attempt > 0 ? `\n- **Tentativa de retrabalho**: ${attempt}/${MAX_REWORK_ATTEMPTS}` : ""}\n\n## Conteúdo\n${artifactText.slice(0, 5000)}\n\n## Avalie nos critérios (0-100 cada):\n{"scores": {"completeness": 0, "technical_quality": 0, "clarity": 0, "best_practices": 0, "actionability": 0}, "overall_score": 0, "result": "pass|fail|warning", "issues": [], "suggestions": [], "summary": "", "verdict": "approve|reject|request_changes"}\n\nRegras: overall_score >= ${APPROVAL_THRESHOLD} → approve; ${REWORK_THRESHOLD}-${APPROVAL_THRESHOLD - 1} → request_changes; < ${REWORK_THRESHOLD} → reject`,
          true
        );

        let validation: any;
        try { validation = JSON.parse(aiResult.content); }
        catch { validation = { overall_score: 50, result: "warning", verdict: "request_changes", summary: "Falha ao parsear", issues: [], suggestions: [], scores: {} }; }

        const validationDuration = Date.now() - validationStart;
        totalTokens += aiResult.tokens; totalCost += aiResult.costUsd;

        await serviceClient.from("validation_runs").insert({
          artifact_id: currentArtifactId,
          type: attempt > 0 ? "ai_quality_review_post_rework" : "ai_quality_review",
          result: validation.result || "warning",
          logs: JSON.stringify({ scores: validation.scores, overall_score: validation.overall_score, issues: validation.issues, suggestions: validation.suggestions, summary: validation.summary, verdict: validation.verdict, attempt }),
          duration: validationDuration,
        });

        await serviceClient.from("artifact_reviews").insert({
          output_id: currentArtifactId, reviewer_id: user.id, action: "ai_analysis",
          previous_status: artifact.status, new_status: artifact.status,
          comment: JSON.stringify(validation),
        });

        finalValidation = validation;
        const score = validation.overall_score || 0;

        // Architect cross-review for code artifacts
        if (score >= APPROVAL_THRESHOLD && artifact.type === "code" && architectAgentForReview) {
          try {
            const archCrossReview = await callAI(apiKey,
              `Você é o Architect "${architectAgentForReview.name}". Faça uma CROSS-REVIEW arquitetural.\nRetorne APENAS JSON: {"arch_approved": true/false, "arch_score": 0-100, "arch_issues": [], "arch_notes": ""}`,
              `## Artefato: ${artifact.summary || "código"}\n## Conteúdo:\n${artifactText.slice(0, 4000)}`,
              true
            );
            totalTokens += archCrossReview.tokens; totalCost += archCrossReview.costUsd;
            let archFeedback: any;
            try { archFeedback = JSON.parse(archCrossReview.content); }
            catch { archFeedback = { arch_approved: true, arch_score: 80, arch_issues: [], arch_notes: "" }; }

            await serviceClient.from("validation_runs").insert({
              artifact_id: currentArtifactId, type: "architect_cross_review",
              result: archFeedback.arch_approved ? "pass" : "warning",
              logs: JSON.stringify(archFeedback), duration: archCrossReview.durationMs,
            });
            await serviceClient.from("artifact_reviews").insert({
              output_id: currentArtifactId, reviewer_id: user.id, action: "architect_cross_review",
              previous_status: artifact.status, new_status: artifact.status,
              comment: JSON.stringify(archFeedback),
            });

            if (!archFeedback.arch_approved && (archFeedback.arch_score || 0) < 60) {
              validation.overall_score = Math.round((score + (archFeedback.arch_score || 50)) / 2);
              validation.issues = [...(validation.issues || []), ...(archFeedback.arch_issues || [])];
              finalValidation = validation;
              if (validation.overall_score < APPROVAL_THRESHOLD) {
                if (attempt < MAX_REWORK_ATTEMPTS) continue;
                await serviceClient.from("agent_outputs").update({ status: "pending_review" }).eq("id", currentArtifactId);
                failCount++; break;
              }
            }
          } catch (archErr) { console.warn("Architect cross-review failed:", archErr); }
        }

        // Auto-approve
        if (score >= APPROVAL_THRESHOLD) {
          await serviceClient.from("agent_outputs").update({ status: "approved" }).eq("id", currentArtifactId);
          await serviceClient.from("artifact_reviews").insert({
            output_id: currentArtifactId, reviewer_id: user.id, action: "auto_approved",
            previous_status: artifact.status, new_status: "approved",
            comment: `Aprovado automaticamente. Score: ${score}/100. ${attempt > 0 ? `Após ${attempt} retrabalho(s).` : "Primeira análise."}`,
          });
          passCount++; autoApprovedCount++;
          await pipelineLog(ctx, "artifact_auto_approved", `Artefato ${artifact.summary?.slice(0, 50)} aprovado (score ${score})`, { artifact_id: currentArtifactId, score, attempt });
          break;
        }

        // Auto-reject
        if (score < REWORK_THRESHOLD) {
          await serviceClient.from("agent_outputs").update({ status: "rejected" }).eq("id", currentArtifactId);
          await serviceClient.from("artifact_reviews").insert({
            output_id: currentArtifactId, reviewer_id: user.id, action: "auto_rejected",
            previous_status: artifact.status, new_status: "rejected",
            comment: `Rejeitado. Score: ${score}/100. Problemas: ${(validation.issues || []).join("; ")}`,
          });
          failCount++; autoRejectedCount++;
          break;
        }

        // Auto-rework
        if (attempt < MAX_REWORK_ATTEMPTS) {
          reworkAttempts++; reworkedCount++;
          const feedbackForRework = [...(validation.issues || []).map((i: string) => `Problema: ${i}`), ...(validation.suggestions || []).map((s: string) => `Sugestão: ${s}`)].join("\n");

          const reworkResult = await callAI(apiKey,
            `Você é o agente "${(artifact as any).agents?.name || "Dev"}". Está fazendo RETRABALHO de um artefato que recebeu score ${score}/100. Corrija TODOS os problemas. Retorne o output COMPLETO corrigido.`,
            `## Output Atual\n${artifactText.slice(0, 6000)}\n\n## Feedback (score: ${score}/100)\n${feedbackForRework}\n\n## Resumo\n${validation.summary}\n\nRetorne o output COMPLETO corrigido. Sem markdown wrapping.`
          );

          const newOutput = reworkResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
          totalTokens += reworkResult.tokens; totalCost += reworkResult.costUsd;

          currentOutput = artifact.type === "code"
            ? { ...(typeof artifact.raw_output === "object" ? artifact.raw_output : {}), content: newOutput, text: newOutput }
            : { text: newOutput };

          await serviceClient.from("agent_outputs").update({
            raw_output: currentOutput,
            tokens_used: (artifact.tokens_used || 0) + reworkResult.tokens,
            cost_estimate: Number(artifact.cost_estimate || 0) + reworkResult.costUsd,
            updated_at: new Date().toISOString(),
          }).eq("id", currentArtifactId);

          if (artifact.subtask_id) {
            await serviceClient.from("story_subtasks").update({
              output: newOutput, executed_at: new Date().toISOString(),
            }).eq("id", artifact.subtask_id);
          }

          await serviceClient.from("artifact_reviews").insert({
            output_id: currentArtifactId, reviewer_id: user.id, action: "auto_rework",
            previous_status: artifact.status, new_status: "draft",
            comment: JSON.stringify({ iteration: attempt + 1, previous_score: score, trigger: "validation_gate", feedback_summary: feedbackForRework.slice(0, 500) }),
          });
        } else {
          // Escalate to human
          await serviceClient.from("agent_outputs").update({ status: "pending_review" }).eq("id", currentArtifactId);
          await serviceClient.from("artifact_reviews").insert({
            output_id: currentArtifactId, reviewer_id: user.id, action: "escalated_to_human",
            previous_status: artifact.status, new_status: "pending_review",
            comment: `Escalado para revisão humana após ${MAX_REWORK_ATTEMPTS} retrabalhos. Score: ${score}/100.`,
          });
          break;
        }
      }

      validationResults.push({
        artifact_id: currentArtifactId, type: artifact.type,
        agent: (artifact as any).agents?.name,
        score: finalValidation?.overall_score || 0,
        result: finalValidation?.result || "warning",
        rework_attempts: reworkAttempts,
      });
    }

    // Recalculate final status
    const { data: artifactsAfter } = await serviceClient.from("agent_outputs")
      .select("id, status")
      .in("subtask_id", subtaskIds.length > 0 ? subtaskIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("organization_id", ctx.organizationId);

    const artifactsFinal = artifactsAfter || artifacts;
    const artifactsTotal = artifactsFinal.length;
    const approvedCountFinal = artifactsFinal.filter((a: any) => a.status === "approved").length;
    const rejectedCountFinal = artifactsFinal.filter((a: any) => a.status === "rejected").length;
    const pendingReviewCountFinal = artifactsFinal.filter((a: any) => a.status === "pending_review").length;
    const remainingToValidate = Math.max(artifactsTotal - approvedCountFinal, 0);
    const batchIncomplete = artifactsToValidate.length > artifactsBatch.length;
    const overallPass = artifactsTotal > 0 && approvedCountFinal === artifactsTotal;
    const nextStatus = overallPass ? "ready_to_publish" : "validating";

    await updateInitiative(ctx, { stage_status: nextStatus });

    if (jobId) await completeJob(ctx, jobId, {
      artifacts_validated: artifactsTotal, processed_in_batch: artifactsBatch.length,
      passed: approvedCountFinal, failed: rejectedCountFinal, pending_review: pendingReviewCountFinal,
      reworked: reworkedCount, auto_approved: autoApprovedCount, auto_rejected: autoRejectedCount,
      warnings: pendingReviewCountFinal, results: validationResults,
      remaining_to_validate: remainingToValidate, batch_incomplete: batchIncomplete, overall_pass: overallPass,
    }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });

    await pipelineLog(ctx, "pipeline_validation_complete",
      `Validação: ${artifactsBatch.length} processados, ${remainingToValidate} pendentes, ${rejectedCountFinal} rejeitados`,
      { total_tokens: totalTokens, cost_usd: totalCost, overall_pass: overallPass, batch_incomplete: batchIncomplete });

    return jsonResponse({
      success: true, artifacts_validated: artifactsTotal, processed_in_batch: artifactsBatch.length,
      passed: approvedCountFinal, failed: rejectedCountFinal, pending_review: pendingReviewCountFinal,
      reworked: reworkedCount, auto_approved: autoApprovedCount, auto_rejected: autoRejectedCount,
      warnings: pendingReviewCountFinal, remaining_to_validate: remainingToValidate,
      batch_incomplete: batchIncomplete, overall_pass: overallPass, job_id: jobId,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
