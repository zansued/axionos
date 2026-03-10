import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, recordError, updateNodeStatus, getNodeByPath, markErrorFixed } from "../_shared/brain-helpers.ts";

/**
 * Camada 5 — Verificação com Fix Loop Automático
 * 3 agentes especializados + Fix Loop (max 3 tentativas):
 *   1. Static Analysis (Agente 15) — lint, tipos, imports, complexidade
 *   2. Runtime QA     (Agente 16) — cenários de teste, edge cases, segurança
 *   3. Fix Agent      (Agente 17) — corrige automaticamente issues encontrados
 *
 * Fix Loop: após cada fix, re-executa Static + Runtime completos.
 * Se após 3 tentativas ainda falhar → escala para humano (pending_review).
 */

const MAX_FIX_ATTEMPTS = 3;
const APPROVAL_THRESHOLD = 70;
const BATCH_SIZE = 2;

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-validation");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const jobId = await createJob(ctx, "validation", { initiative_id: ctx.initiativeId, mode: "fix_loop_v2" });

  // Mark stale jobs as failed
  if (jobId) {
    await serviceClient.from("initiative_jobs").update({
      status: "failed", error: "Execução interrompida antes de finalizar (timeout/redeploy).",
      completed_at: new Date().toISOString(),
    }).eq("initiative_id", ctx.initiativeId).eq("stage", "validation").eq("status", "running").neq("id", jobId);
  }

  await pipelineLog(ctx, "pipeline_validation_start", "Fix Loop v2: Static Analysis → Runtime QA → Fix Agent (max 3x)...");

  try {
    // ── Collect artifacts ──
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

    // All already approved → skip
    if (artifactsToValidate.length === 0) {
      await updateInitiative(ctx, { stage_status: "ready_to_publish" });
      if (jobId) await completeJob(ctx, jobId, {
        artifacts_validated: artifacts.length, passed: artifacts.length, failed: 0, fixed: 0,
        remaining_to_validate: 0, batch_incomplete: false, overall_pass: true, skipped: "all_already_approved",
      }, { model: "routed", costUsd: 0, durationMs: 0 });
      return jsonResponse({ success: true, artifacts_validated: artifacts.length, passed: artifacts.length, failed: 0, fixed: 0, remaining_to_validate: 0, batch_incomplete: false, overall_pass: true, job_id: jobId });
    }

    const batch = artifactsToValidate.slice(0, BATCH_SIZE);

    // ── Fetch architecture + brain context ──
    let archContext = "";
    if (initiative.architecture_content) {
      archContext = String(initiative.architecture_content).slice(0, 2000);
    }
    let brainContext = "";
    try { brainContext = await generateBrainContext(ctx); } catch {}
    const brainBlock = brainContext ? `\n\n${brainContext}` : "";

    let totalTokens = 0, totalCost = 0;
    let passCount = 0, failCount = 0, fixedCount = 0;
    const validationResults: any[] = [];

    // ── Process each artifact through Fix Loop ──
    for (const artifact of batch) {
      const agentName = (artifact as any).agents?.name || "?";
      const isCode = artifact.type === "code";
      let currentText = extractText(artifact.raw_output);
      let fixAttempts = 0;
      let lastCombinedScore = 0;
      let approved = false;

      // ════════════════════════════════════════
      // FIX LOOP: validate → fix → re-validate (up to MAX_FIX_ATTEMPTS)
      // ════════════════════════════════════════
      for (let loop = 0; loop <= MAX_FIX_ATTEMPTS; loop++) {
        const isFirstPass = loop === 0;

        // ═══ AGENT 15: Static Analysis (full) ═══
        const staticResult = await callAI(apiKey,
          `Você é o agente "Static Analysis" (Agente 15). ${!isFirstPass ? `Esta é a re-validação #${loop} após correção pelo Fix Agent.` : ""}
Analise o artefato quanto a:
- Lint: erros de sintaxe, nomes inconsistentes, formatação
- Tipos: type safety, interfaces faltando, any desnecessário
- Imports: dependências circulares, imports faltando ou não utilizados
- Complexidade: funções longas (>50 linhas), nesting profundo (>3)
- Padrões: violações de Clean Architecture, naming conventions, SOLID
${archContext ? `\n## Contexto Arquitetural\n${archContext}` : ""}${brainBlock}

Retorne APENAS JSON válido:
{"static_score": 0-100, "issues": [{"severity": "error|warning|info", "category": "lint|types|imports|complexity|patterns", "message": "...", "suggestion": "..."}], "summary": "...", "imports_valid": true/false, "type_safety_score": 0-100, "complexity_score": 0-100}`,
          `## Artefato: ${artifact.summary || "N/A"}\n- Tipo: ${artifact.type}\n- Agente: ${agentName}\n- Loop: ${loop}/${MAX_FIX_ATTEMPTS}\n\n## Conteúdo\n${currentText.slice(0, 5000)}`,
          true
        );
        totalTokens += staticResult.tokens; totalCost += staticResult.costUsd;

        let staticAnalysis: any;
        try { staticAnalysis = JSON.parse(staticResult.content); }
        catch { staticAnalysis = { static_score: 60, issues: [], summary: "Falha ao parsear", imports_valid: true, type_safety_score: 60, complexity_score: 60 }; }

        await persistValidationRun(serviceClient, artifact.id, isFirstPass ? "static_analysis" : `static_revalidation_${loop}`, staticAnalysis, staticResult.durationMs);
        if (isFirstPass) await persistReview(serviceClient, artifact.id, user.id, "static_analysis", artifact.status, JSON.stringify(staticAnalysis));

        // ═══ AGENT 16: Runtime QA (full) ═══
        const runtimeResult = await callAI(apiKey,
          `Você é o agente "Runtime QA" (Agente 16). ${!isFirstPass ? `Re-validação #${loop} após Fix Agent.` : ""}
Analise o artefato quanto a comportamento em runtime:
- Cenários de teste: happy path, edge cases, inputs inválidos
- Segurança: XSS, injection, dados sensíveis expostos, auth bypass
- Performance: N+1 queries, loops desnecessários, memory leaks
- Resiliência: tratamento de erros, timeouts, retry logic, null safety
- Integração: compatibilidade com APIs, contratos, schema de banco

Retorne APENAS JSON:
{"runtime_score": 0-100, "test_scenarios": [{"name": "...", "type": "happy|edge|error|security", "expected": "...", "risk": "low|medium|high"}], "security_issues": [], "performance_issues": [], "resilience_score": 0-100, "summary": "..."}`,
          `## Artefato: ${artifact.summary || "N/A"}\n- Tipo: ${artifact.type}\n- Loop: ${loop}/${MAX_FIX_ATTEMPTS}\n\n## Static Analysis Issues\n${JSON.stringify(staticAnalysis.issues?.slice(0, 10) || [])}\n\n## Conteúdo\n${currentText.slice(0, 5000)}`,
          true
        );
        totalTokens += runtimeResult.tokens; totalCost += runtimeResult.costUsd;

        let runtimeQA: any;
        try { runtimeQA = JSON.parse(runtimeResult.content); }
        catch { runtimeQA = { runtime_score: 60, test_scenarios: [], security_issues: [], performance_issues: [], resilience_score: 60, summary: "Falha ao parsear" }; }

        await persistValidationRun(serviceClient, artifact.id, isFirstPass ? "runtime_qa" : `runtime_revalidation_${loop}`, runtimeQA, runtimeResult.durationMs);
        if (isFirstPass) await persistReview(serviceClient, artifact.id, user.id, "runtime_qa", artifact.status, JSON.stringify(runtimeQA));

        // Combined score
        const combinedScore = Math.round(((staticAnalysis.static_score || 0) + (runtimeQA.runtime_score || 0)) / 2);
        lastCombinedScore = combinedScore;
        const hasErrors = (staticAnalysis.issues || []).some((i: any) => i.severity === "error");
        const hasSecurityIssues = (runtimeQA.security_issues || []).length > 0;
        const passes = combinedScore >= APPROVAL_THRESHOLD && !hasErrors && !hasSecurityIssues;

        if (passes) {
          // ✅ APPROVED
          await serviceClient.from("agent_outputs").update({ status: "approved" }).eq("id", artifact.id);
          const approvalMsg = isFirstPass
            ? `Aprovado na primeira verificação. Static: ${staticAnalysis.static_score}, Runtime: ${runtimeQA.runtime_score}, Combined: ${combinedScore}/100`
            : `Aprovado após ${fixAttempts} fix(es). Static: ${staticAnalysis.static_score}, Runtime: ${runtimeQA.runtime_score}, Combined: ${combinedScore}/100`;
          await persistReview(serviceClient, artifact.id, user.id, "auto_approved", artifact.status, approvalMsg);
          passCount++;
          if (!isFirstPass) fixedCount++;
          approved = true;

          await pipelineLog(ctx, isFirstPass ? "artifact_auto_approved" : "artifact_fixed_approved",
            `Artefato ${artifact.summary?.slice(0, 50)} ${isFirstPass ? "aprovado" : `corrigido e aprovado (${fixAttempts}x fix)`} (${combinedScore}/100)`,
            { artifact_id: artifact.id, fix_attempts: fixAttempts, static: staticAnalysis.static_score, runtime: runtimeQA.runtime_score });

          // Update brain node to validated
          try {
            const raw = artifact.raw_output as any;
            const filePath = raw?.file_path;
            if (filePath) {
              const node = await getNodeByPath(ctx, filePath);
              if (node) await updateNodeStatus(ctx, node.id, "validated");
            }
          } catch {}

          // Store successful fix pattern for learning
          if (!isFirstPass) {
            try {
              await serviceClient.from("agent_memory").insert({
                agent_id: artifact.agent_id || user.id,
                organization_id: ctx.organizationId,
                initiative_id: ctx.initiativeId,
                key: `fix_pattern:${(artifact.raw_output as any)?.file_path || artifact.id}`,
                value: `Score ${combinedScore}/100 após ${fixAttempts} fix(es). Issues corrigidos automaticamente.`,
                memory_type: "lesson_learned",
                scope: "initiative",
              });
            } catch {}
          }

          break; // Exit fix loop
        }

        // If this is the last attempt, don't try to fix again
        if (loop === MAX_FIX_ATTEMPTS) {
          // ❌ ESCALATE TO HUMAN
          await serviceClient.from("agent_outputs").update({ status: "pending_review" }).eq("id", artifact.id);
          await persistReview(serviceClient, artifact.id, user.id, "escalated_to_human", artifact.status,
            `Escalado após ${MAX_FIX_ATTEMPTS} tentativas. Score final: ${combinedScore}/100. Errors: ${hasErrors}, Security: ${hasSecurityIssues}`);
          failCount++;

          await pipelineLog(ctx, "artifact_escalated",
            `⚠️ Artefato ${artifact.summary?.slice(0, 50)} escalado para revisão humana após ${MAX_FIX_ATTEMPTS} fixes (${combinedScore}/100)`,
            { artifact_id: artifact.id, fix_attempts: MAX_FIX_ATTEMPTS, final_score: combinedScore });
          break;
        }

        // ═══ AGENT 17: Fix Agent ═══
        fixAttempts++;
        const allIssues = [
          ...(staticAnalysis.issues || []).filter((i: any) => i.severity !== "info").map((i: any) => `[${i.category}] ${i.message}${i.suggestion ? " → " + i.suggestion : ""}`),
          ...(runtimeQA.security_issues || []).map((s: string) => `[security] ${s}`),
          ...(runtimeQA.performance_issues || []).map((p: string) => `[performance] ${p}`),
        ].join("\n");

        const fixResult = await callAI(apiKey,
          `Você é o "Fix Agent" (Agente 17). Tentativa ${fixAttempts}/${MAX_FIX_ATTEMPTS}.
Seu trabalho é CORRIGIR código/artefatos com base nos issues de Static Analysis e Runtime QA.

Regras:
1. Corrija TODOS os issues de severidade "error" e "warning"
2. Corrija issues de segurança OBRIGATORIAMENTE
3. Melhore performance quando possível
4. NÃO adicione comentários explicativos no código — apenas corrija
5. Retorne o artefato COMPLETO corrigido, sem markdown wrapping
6. Se não for código, retorne o texto corrigido e melhorado
7. ATENÇÃO: este é o attempt ${fixAttempts} de ${MAX_FIX_ATTEMPTS}. Se falhar novamente, será escalado para humano.`,
          `## Artefato (score: ${combinedScore}/100, attempt ${fixAttempts}/${MAX_FIX_ATTEMPTS})\n${currentText.slice(0, 6000)}\n\n## Issues Encontrados\n${allIssues}\n\n## Static Analysis\n${staticAnalysis.summary}\n\n## Runtime QA\n${runtimeQA.summary}\n\nRetorne o output COMPLETO corrigido.`
        );
        totalTokens += fixResult.tokens; totalCost += fixResult.costUsd;

        const fixedOutput = fixResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
        currentText = fixedOutput;

        // Update artifact with fixed content
        const newRawOutput = isCode
          ? { ...(typeof artifact.raw_output === "object" ? artifact.raw_output : {}), content: fixedOutput, text: fixedOutput }
          : { text: fixedOutput };

        await serviceClient.from("agent_outputs").update({
          raw_output: newRawOutput,
          tokens_used: (artifact.tokens_used || 0) + fixResult.tokens,
          cost_estimate: Number(artifact.cost_estimate || 0) + fixResult.costUsd,
          updated_at: new Date().toISOString(),
        }).eq("id", artifact.id);

        if (artifact.subtask_id) {
          await serviceClient.from("story_subtasks").update({
            output: fixedOutput, executed_at: new Date().toISOString(),
          }).eq("id", artifact.subtask_id);
        }

        await persistReview(serviceClient, artifact.id, user.id, "fix_agent",
          artifact.status, `Fix attempt ${fixAttempts}/${MAX_FIX_ATTEMPTS}. Score antes: ${combinedScore}/100`);

        await pipelineLog(ctx, "fix_agent_attempt",
          `Fix Agent: tentativa ${fixAttempts}/${MAX_FIX_ATTEMPTS} para ${artifact.summary?.slice(0, 40)} (score: ${combinedScore})`,
          { artifact_id: artifact.id, attempt: fixAttempts, score_before: combinedScore });

        // Mark fixed errors in brain
        try {
          const errors = (staticAnalysis.issues || []).filter((i: any) => i.severity === "error");
          for (const err of errors.slice(0, 5)) {
            const raw = artifact.raw_output as any;
            const errorId = await recordError(ctx, err.message, err.category || "typescript", raw?.file_path, err.message, err.suggestion);
            if (errorId) await markErrorFixed(serviceClient, errorId, artifact.agent_id || undefined);
          }
        } catch {}

        // Loop continues → next iteration will re-validate with full Static + Runtime
      }

      if (!approved) {
        // Record errors to brain for learning (final state)
        try {
          const raw = artifact.raw_output as any;
          await recordError(ctx,
            `Artefato falhou após ${MAX_FIX_ATTEMPTS} tentativas de fix automático (score: ${lastCombinedScore})`,
            "fix_loop_exhausted", raw?.file_path,
            `Score insuficiente após ${MAX_FIX_ATTEMPTS} ciclos completos de validação`,
            `Artefato ${raw?.file_path || artifact.summary} requer revisão humana — fix automático insuficiente`
          );
        } catch {}
      }

      validationResults.push({
        artifact_id: artifact.id, type: artifact.type,
        agent: agentName,
        combined_score: lastCombinedScore,
        result: approved ? "pass" : "fail",
        fix_attempts: fixAttempts,
        fixed: approved && fixAttempts > 0,
      });
    }

    // ── Recalculate final status ──
    const { data: artifactsAfter } = await serviceClient.from("agent_outputs")
      .select("id, status")
      .in("subtask_id", subtaskIds.length > 0 ? subtaskIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("organization_id", ctx.organizationId);

    const artifactsFinal = artifactsAfter || artifacts;
    const total = artifactsFinal.length;
    const approvedCount = artifactsFinal.filter((a: any) => a.status === "approved").length;
    const rejected = artifactsFinal.filter((a: any) => a.status === "rejected").length;
    const pending = artifactsFinal.filter((a: any) => a.status === "pending_review").length;
    const remaining = Math.max(total - approvedCount, 0);
    const batchIncomplete = artifactsToValidate.length > batch.length;
    const overallPass = total > 0 && approvedCount === total;

    await updateInitiative(ctx, { stage_status: overallPass ? "ready_to_publish" : "validating" });

    if (jobId) await completeJob(ctx, jobId, {
      artifacts_validated: total, processed_in_batch: batch.length,
      passed: approvedCount, failed: rejected, pending_review: pending,
      fixed: fixedCount, results: validationResults,
      remaining_to_validate: remaining, batch_incomplete: batchIncomplete, overall_pass: overallPass,
    }, { model: "routed", costUsd: totalCost, durationMs: 0 });

    await pipelineLog(ctx, "pipeline_validation_complete",
      `Fix Loop v2: ${batch.length} processados, ${fixedCount} corrigidos, ${pending} escalados, ${remaining} pendentes`,
      { total_tokens: totalTokens, cost_usd: totalCost, overall_pass: overallPass, fixed: fixedCount, escalated: pending });

    return jsonResponse({
      success: true, artifacts_validated: total, processed_in_batch: batch.length,
      passed: approvedCount, failed: rejected, pending_review: pending,
      fixed: fixedCount, remaining_to_validate: remaining,
      batch_incomplete: batchIncomplete, overall_pass: overallPass, job_id: jobId,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});

// ── Helpers ──

function extractText(raw: any): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") return raw?.text || raw?.content || JSON.stringify(raw);
  return String(raw);
}

async function persistValidationRun(client: any, artifactId: string, type: string, data: any, duration: number) {
  await client.from("validation_runs").insert({
    artifact_id: artifactId,
    type,
    result: (data.score || data.static_score || data.runtime_score || 0) >= 70 ? "pass" : "warning",
    logs: JSON.stringify(data),
    duration: duration || 0,
  });
}

async function persistReview(client: any, outputId: string, userId: string, action: string, prevStatus: string, comment: string) {
  await client.from("artifact_reviews").insert({
    output_id: outputId,
    reviewer_id: userId,
    action,
    previous_status: prevStatus,
    new_status: prevStatus,
    comment,
  });
}
