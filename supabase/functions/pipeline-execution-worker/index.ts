// Execution Worker — generates a single file artifact using the agent chain
// Called by the Orchestrator for each node in the execution DAG
// Chain: Code Architect → Developer → Integration Agent

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, recordAgentMessage, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { sanitizePackageJson, DETERMINISTIC_FILES } from "../_shared/code-sanitizers.ts";
import { generateBrainContext, upsertNode, getNodeByPath, updateNodeStatus, recordError } from "../_shared/brain-helpers.ts";
import { updateBrainEdgesFromImports } from "../_shared/dependency-scheduler.ts";
import { simpleHash } from "../_shared/incremental-engine.ts";
import { embedBrainNode } from "../_shared/embedding-helpers.ts";
import type { PipelineContext } from "../_shared/pipeline-helpers.ts";
import { executeConsolidatedPath, buildStandardPathMetrics, type ConsolidatedMetrics } from "../_shared/consolidated-worker-prototype.ts";
import { evaluateFastPathEligibility, type FastPathEligibility } from "../_shared/execution-fast-path.ts";
import { classifyIntegrationSeverity } from "../_shared/integration-severity.ts";
import { type ExecutionMetrics, type ValidationSignals, type FastPathPolicyRecord, validateSyntax, validateImports, countImports } from "../_shared/execution-metrics-contract.ts";
import { computeExecutionRiskSignals, type RiskAssessment } from "../_shared/execution-risk-signals.ts";
import { classifyExecutionRisk, type ExecutionClassification } from "../_shared/execution-risk-classifier.ts";

interface WorkerPayload {
  initiativeId: string;
  organizationId: string;
  userId: string;
  workspaceId: string | null;
  // Node info
  nodeId: string;
  subtaskId: string;
  filePath: string;
  fileType: string | null;
  nodeType: string;
  fileName: string;
  storyId: string | null;
  description: string;
  waveNum: number;
  // Sprint 203: Canonical traceability IDs
  traceId?: string;
  attemptId?: string;
  retryAttempt?: number;
  // Context
  projectTitle: string;
  projectDescription: string;
  projectStructure: string;
  dependencyCode: string;       // code from direct dependencies
  otherGeneratedCode: string;   // code from other already-generated files
  prdSnippet: string;
  architectureSnippet: string;
  dataArchContext: string;
  apiContext: string;
  fileTreeContext: string;
  supabaseConnInfo: string;
  memoryContext: string;
  // Agents
  codeArchitect: { id: string; name: string; role: string; description?: string } | null;
  developer: { id: string; name: string; role: string; description?: string } | null;
  integrationAgent: { id: string; name: string; role: string; description?: string } | null;
  /** OX-3: Feature flag — use consolidated 2-call path instead of standard 3-call */
  useConsolidatedWorker?: boolean;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Workers are invoked internally by the orchestrator — authenticate via service role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: WorkerPayload = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY") || "";

    const ctx: PipelineContext = {
      serviceClient,
      userId: payload.userId,
      initiativeId: payload.initiativeId,
      organizationId: payload.organizationId,
    };

    // Fire job creation and subtask status update in parallel
    const [jobId] = await Promise.all([
      createJob(ctx, "execution_worker", {
        subtask_id: payload.subtaskId,
        file_path: payload.filePath,
        wave: payload.waveNum,
        node_id: payload.nodeId,
      }),
      serviceClient.from("story_subtasks").update({
        status: "in_progress",
        executed_by_agent_id: payload.developer?.id || null,
      }).eq("id", payload.subtaskId),
    ]);

    const effectiveCodeArch = payload.codeArchitect || { id: "", name: "CodeArchitect", role: "code_architect" };
    const effectiveDev = payload.developer || { id: "", name: "Developer", role: "developer" };
    const effectiveIntegration = payload.integrationAgent || { id: "", name: "IntegrationAgent", role: "integration_agent" };

    const ext = payload.filePath.split(".").pop() || "ts";
    const langMap: Record<string, string> = { tsx: "TypeScript React", ts: "TypeScript", css: "CSS", json: "JSON", sql: "SQL", html: "HTML" };
    const language = langMap[ext] || "TypeScript";
    const isBackend = ["schema", "migration", "edge_function", "seed", "supabase_client", "auth_config"].includes(payload.fileType || "");

    // Brain context — non-blocking, don't fail the worker if it errors
    let brainBlock = "";
    try { brainBlock = await generateBrainContext(ctx); } catch {}
    if (brainBlock) brainBlock = `\n\n${brainBlock}`;

    const contextStr = payload.dependencyCode + payload.otherGeneratedCode;

    const baseContext = `## Projeto: ${payload.projectTitle}
## Descrição: ${payload.projectDescription}
## Estrutura:\n${payload.projectStructure}
## Arquivos gerados:\n${contextStr || "(nenhum)"}
## Arquivo: ${payload.filePath}
## Tipo: ${payload.fileType || "code"} | Linguagem: ${language}
## Tarefa: ${payload.description}
${payload.prdSnippet ? `## PRD:\n${payload.prdSnippet}` : ""}
${payload.architectureSnippet ? `## Arquitetura:\n${payload.architectureSnippet}` : ""}${payload.dataArchContext}${payload.apiContext}${payload.fileTreeContext}${payload.supabaseConnInfo}${payload.memoryContext}${brainBlock}`;

    let totalTokens = 0, totalCost = 0;
    let codeContent = "";
    let workerMetrics: ConsolidatedMetrics;
    let devModel = "";

    const workerStartedAt = new Date().toISOString();

    // ──── DX-3: Execution Risk Classifier (replaces OX-5 direct eligibility) ────
    const classification: ExecutionClassification = classifyExecutionRisk({
      filePath: payload.filePath,
      fileType: payload.fileType,
      contextLength: (contextStr || "").length + (baseContext || "").length,
      waveNum: payload.waveNum,
      codeContent: "", // pre-generation: no code yet, signals computed post-generation for audit
      retryCount: 0,   // wire from payload when available
      explicitOverride: payload.useConsolidatedWorker,
    });

    // Backward compat: extract legacy values used downstream
    const fastPathEval: FastPathEligibility = classification.legacy_fast_path;
    const useConsolidated = classification.execution_path === "fast_2call";
    console.log(`[DX-3] ${payload.filePath}: tier=${classification.risk_tier}, path=${classification.execution_path}, validation=${classification.validation_posture}, confidence=${classification.confidence}, reason=${classification.primary_reason}`);

    // ──── Branch between consolidated (2-call) and standard (3-call) paths ────
    if (useConsolidated) {
      // ═══════════════════════════════════════════════════════
      // CONSOLIDATED 2-CALL PATH (prototype — feature-flagged)
      // ═══════════════════════════════════════════════════════
      console.log(`[OX-3] Consolidated path for ${payload.filePath}`);

      const consolidated = await executeConsolidatedPath({
        apiKey,
        filePath: payload.filePath,
        fileType: payload.fileType,
        language,
        isBackend,
        baseContext,
        contextStr,
        agentNames: {
          codeArchitect: effectiveCodeArch.name,
          developer: effectiveDev.name,
          integrationAgent: effectiveIntegration.name,
        },
      });

      codeContent = consolidated.codeContent;
      totalTokens = consolidated.totalTokens;
      totalCost = consolidated.totalCostUsd;
      devModel = consolidated.model;
      workerMetrics = consolidated.metrics;

      // Non-blocking: log merged handoff for audit trail
      recordAgentMessage(ctx, {
        storyId: payload.storyId, subtaskId: payload.subtaskId,
        fromAgent: effectiveCodeArch, toAgent: effectiveIntegration,
        content: `[OX-3 consolidated] Merged architect+developer output`,
        messageType: "handoff", iteration: 1,
        tokens: consolidated.callResults.merged?.tokens || 0,
        model: consolidated.model, stage: "execution",
      }).catch(() => {});

    } else {
      // ═══════════════════════════════════════════════════════
      // STANDARD 3-CALL PATH (current production flow)
      // ═══════════════════════════════════════════════════════
      // OX-2: Skip efficiency layer in execution stage
      const execSkipEfficiency = true;

      const codeArchResult = await callAI(apiKey,
        `Você é o Code Architect "${effectiveCodeArch.name}" no AxionOS.
Antes do Developer implementar, você define:
1. Interfaces e tipos TypeScript necessários
2. Contratos de função (parâmetros, retornos)
3. Imports necessários e de onde vêm
4. Padrões de design a seguir
5. Edge cases e validações

Seja técnico e preciso. Foque em ESPECIFICAÇÃO, não implementação.`,
        baseContext,
        false, 3, false, "execution", undefined, undefined, execSkipEfficiency,
      );
      totalTokens += codeArchResult.tokens;
      totalCost += codeArchResult.costUsd;
      recordAgentMessage(ctx, {
        storyId: payload.storyId, subtaskId: payload.subtaskId,
        fromAgent: effectiveCodeArch, toAgent: effectiveDev,
        content: codeArchResult.content, messageType: "handoff",
        iteration: 1, tokens: codeArchResult.tokens, model: codeArchResult.model, stage: "execution",
      }).catch(() => {});

      const backendRules = isBackend ? `\nREGRAS BACKEND:\n- schema (.sql): CREATE TABLE IF NOT EXISTS + RLS + prefixo de tabelas do projeto\n- edge_function: Deno/TS com CORS headers e auth\n- supabase_client: createClient com import.meta.env` : "";
      const devResult = await callAI(apiKey,
        `Você é o Developer "${effectiveDev.name}" no AxionOS.
Recebeu a especificação do Code Architect. Implemente o código COMPLETO.

REGRAS:
- Retorne APENAS o conteúdo do arquivo, sem markdown, sem \`\`\`, sem explicações
- Código COMPLETO e FUNCIONAL
- Siga EXATAMENTE a especificação do Code Architect
- Use shadcn/ui + Tailwind para frontend
${backendRules}

REGRAS package.json:
- NÃO inclua "shadcn/ui" como dependência
- Use "lucide-react" (não "lucide")
- SEMPRE inclua "type": "module"
- Use @vitejs/plugin-react-swc`,
        `${baseContext}\n\n## Especificação do Code Architect:\n${codeArchResult.content}`,
        false, 3, false, "execution", undefined, undefined, execSkipEfficiency,
      );
      codeContent = devResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
      totalTokens += devResult.tokens;
      totalCost += devResult.costUsd;
      devModel = devResult.model;
      recordAgentMessage(ctx, {
        storyId: payload.storyId, subtaskId: payload.subtaskId,
        fromAgent: effectiveDev, toAgent: effectiveIntegration,
        content: codeContent, messageType: "handoff",
        iteration: 1, tokens: devResult.tokens, model: devResult.model, stage: "execution",
      }).catch(() => {});

      const integrationResult = await callAI(apiKey,
        `Você é o Integration Agent "${effectiveIntegration.name}" no AxionOS.
Sua função é verificar e corrigir problemas de integração no código gerado:

1. IMPORTS: Todos os imports existem e apontam para arquivos corretos?
2. DEPENDÊNCIAS: O arquivo usa pacotes que estão no package.json?
3. TIPOS: Os tipos usados são compatíveis com as interfaces definidas?
4. CONEXÕES: APIs, hooks e serviços estão conectados corretamente?
5. CONSISTÊNCIA: O código segue os padrões dos outros arquivos do projeto?

Se encontrar problemas, retorne o código CORRIGIDO completo.
Se tudo estiver correto, retorne o código original sem alterações.

REGRA: Retorne APENAS o conteúdo do arquivo, sem markdown, sem \`\`\`, sem explicações.`,
        `## Arquivo: ${payload.filePath}
## Especificação do Code Architect:\n${codeArchResult.content.slice(0, 2000)}

## Código do Developer:\n${codeContent.slice(0, 8000)}

## Arquivos já gerados (para verificar imports):\n${contextStr || "(nenhum)"}

Verifique integração e retorne o código final (corrigido se necessário).`,
        false, 3, false, "execution", undefined, undefined, execSkipEfficiency,
      );
      totalTokens += integrationResult.tokens;
      totalCost += integrationResult.costUsd;

      const integrationCode = integrationResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
      let integrationModified = false;
      const preIntegrationCode = codeContent;
      if (integrationCode.length > 20 && !integrationCode.startsWith("{\"")) {
        integrationModified = integrationCode !== codeContent;
        codeContent = integrationCode;
      }

      recordAgentMessage(ctx, {
        storyId: payload.storyId, subtaskId: payload.subtaskId,
        fromAgent: effectiveIntegration, toAgent: effectiveDev,
        content: integrationResult.content, messageType: "review",
        iteration: 1, tokens: integrationResult.tokens, model: integrationResult.model, stage: "execution",
      }).catch(() => {});

      workerMetrics = buildStandardPathMetrics(
        codeArchResult, devResult, integrationResult,
        preIntegrationCode, codeContent, integrationModified, workerStartedAt,
      );
    }

    // Override deterministic files
    const deterministicFiles: Record<string, string> = { ...DETERMINISTIC_FILES };
    if (deterministicFiles[payload.filePath]) codeContent = deterministicFiles[payload.filePath];
    if (payload.filePath === "package.json") codeContent = sanitizePackageJson(codeContent);

    // ── OX-6: Structured execution metrics + validation signals ──
    const contextLength = (contextStr || "").length + (baseContext || "").length;
    const ext2 = payload.filePath.split(".").pop() || "ts";
    const knownPaths = (contextStr || "").match(/## Arquivo: ([^\n]+)/g)?.map(m => m.replace("## Arquivo: ", "")) || [];

    const validationSignals: ValidationSignals = {
      import_resolution_ok: validateImports(codeContent, knownPaths),
      syntax_valid: validateSyntax(codeContent, ext2),
      integration_passed: workerMetrics.integrationSeverity !== "major_fix",
    };

    const executionMetrics: ExecutionMetrics = {
      path: useConsolidated ? "fast_2call" : "safe_3call",
      file_type: payload.fileType,
      wave: payload.waveNum,
      context_length: contextLength,
      latency_ms: workerMetrics.totalAiLatencyMs,
      ai_calls: workerMetrics.callLatencies.length,
      tokens_used: workerMetrics.totalTokens,
      cost_usd: workerMetrics.totalCostUsd,
      integration_severity: workerMetrics.integrationSeverity,
      integration_edit_ratio: workerMetrics.integrationEditRatio,
      output_size: workerMetrics.outputLengthChars,
      fast_path_reason: fastPathEval.reason,
      risk_tier: fastPathEval.riskTier,
      retry_count: 0,
    };

    const policyRecord: FastPathPolicyRecord = {
      file_type: payload.fileType,
      context_length: contextLength,
      wave: payload.waveNum,
      import_density: countImports(codeContent),
      historical_fix_rate: 0, // populated by future aggregation
      path_used: useConsolidated ? "fast_2call" : "safe_3call",
      needed_major_fix: workerMetrics.integrationSeverity === "major_fix",
      validation_passed: validationSignals.syntax_valid && validationSignals.integration_passed,
      recorded_at: new Date().toISOString(),
    };

    // ── DX-3: Post-generation re-classification with actual code ──
    const postGenClassification: ExecutionClassification = classifyExecutionRisk({
      filePath: payload.filePath,
      fileType: payload.fileType,
      contextLength: contextLength,
      waveNum: payload.waveNum,
      codeContent: codeContent,
      retryCount: 0,
      explicitOverride: payload.useConsolidatedWorker,
    });
    const riskAssessment = postGenClassification.risk_assessment;
    console.log(`[DX-3] ${payload.filePath} post-gen: tier=${postGenClassification.risk_tier}, composite=${riskAssessment.composite_score}, factors=[${riskAssessment.top_factors.join("; ")}]`);

    serviceClient.from("pipeline_job_metrics").insert({
      organization_id: payload.organizationId,
      initiative_id: payload.initiativeId,
      job_type: "execution_worker",
      metadata: {
        ox6_execution_metrics: executionMetrics,
        ox6_validation_signals: validationSignals,
        ox6_policy_record: policyRecord,
        ox5_fast_path: fastPathEval,
        ox3_metrics: workerMetrics,
        dx3_pre_classification: classification,
        dx3_post_classification: postGenClassification,
        file_path: payload.filePath,
        file_type: payload.fileType,
        wave: payload.waveNum,
        node_id: payload.nodeId,
      },
    }).then(() => {}).catch((e: unknown) => {
      console.warn("[DX-3] Metrics log failed (non-blocking):", e);
    });

    // ── Persist subtask output + create artifact in parallel ──
    const [, artifactResult] = await Promise.all([
      serviceClient.from("story_subtasks").update({
        output: codeContent, status: "completed", executed_at: new Date().toISOString(),
      }).eq("id", payload.subtaskId),
      serviceClient.from("agent_outputs").insert({
        organization_id: payload.organizationId,
        workspace_id: payload.workspaceId,
        initiative_id: payload.initiativeId,
        agent_id: effectiveDev.id || null,
        subtask_id: payload.subtaskId,
        type: "code", status: "draft",
        summary: `${payload.filePath} — ${payload.description.slice(0, 150)}`,
        raw_output: {
          file_path: payload.filePath, file_type: payload.fileType,
          language: ext, content: codeContent,
          chain: payload.useConsolidatedWorker
            ? ["merged_architect_developer", "integration_agent"]
            : ["code_architect", "developer", "integration_agent"],
          wave: payload.waveNum,
          ox3_path: workerMetrics.path,
        },
        model_used: devModel, prompt_used: payload.description,
        tokens_used: totalTokens, cost_estimate: totalCost,
      }).select("id").single(),
    ]);
    const artifact = artifactResult.data;

    if (artifact?.id) {
      // Non-blocking — code_artifacts insert is not on critical path
      serviceClient.from("code_artifacts").insert({
        output_id: artifact.id,
        files_affected: [{ path: payload.filePath, type: payload.fileType, language: ext }],
        build_status: "pending", test_status: "pending",
      }).then(() => {}).catch(() => {});
    }

    // ── Update Project Brain with content hash + embedding ──
    const contentHash = simpleHash(codeContent);
    try {
      const existingNode = await getNodeByPath(ctx, payload.filePath);
      let nodeId: string;
      if (existingNode) {
        await ctx.serviceClient.from("project_brain_nodes").update({
          status: "generated",
          content_hash: contentHash,
        }).eq("id", existingNode.id);
        nodeId = existingNode.id;
      } else {
        nodeId = await upsertNode(ctx, {
          node_type: payload.nodeType as any,
          name: payload.fileName,
          file_path: payload.filePath,
          content_hash: contentHash,
          status: "generated",
        });
      }
      await updateBrainEdgesFromImports(ctx, payload.filePath, codeContent);

      // Generate embedding asynchronously (non-blocking)
      embedBrainNode(
        ctx, nodeId,
        `File: ${payload.filePath}\nType: ${payload.fileType}\nDescription: ${payload.description}\n\n${codeContent.slice(0, 3000)}`,
        apiKey,
      ).catch(e => console.warn("[worker] Embedding generation failed:", e));
    } catch (e) { console.error("Brain update error:", e); }

    if (jobId) await completeJob(ctx, jobId, {
      artifact_id: artifact?.id, file_path: payload.filePath, wave: payload.waveNum,
    }, { model: devModel, costUsd: totalCost, durationMs: workerMetrics.totalAiLatencyMs });

    // Sprint 205: Emit operational learning signal
    try {
      await serviceClient.from("operational_learning_signals").insert({
        organization_id: payload.organizationId,
        initiative_id: payload.initiativeId || null,
        signal_type: "execution_completed",
        outcome: `Generated ${payload.filePath} (wave ${payload.waveNum}, ${totalTokens} tokens, $${totalCost.toFixed(4)})`,
        outcome_success: true,
        payload: {
          file_path: payload.filePath,
          wave: payload.waveNum,
          tokens: totalTokens,
          cost_usd: totalCost,
          model: devModel,
        },
      });
    } catch (_) { /* non-blocking */ }

    return jsonResponse({
      success: true,
      filePath: payload.filePath,
      nodeId: payload.nodeId,
      artifactId: artifact?.id,
      codeContent,
      tokens: totalTokens,
      costUsd: totalCost,
      model: devModel,
      ox3_metrics: workerMetrics,
    });

  } catch (e) {
    console.error("Worker error:", e);
    return jsonResponse({
      success: false,
      error: e instanceof Error ? e.message : "Unknown worker error",
    }, 500);
  }
});
