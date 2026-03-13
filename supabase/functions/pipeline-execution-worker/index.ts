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

    // Brain context
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

    // ──── Step 1: CODE ARCHITECT ────
    const codeArchResult = await callAI(apiKey,
      `Você é o Code Architect "${effectiveCodeArch.name}" no AxionOS.
Antes do Developer implementar, você define:
1. Interfaces e tipos TypeScript necessários
2. Contratos de função (parâmetros, retornos)
3. Imports necessários e de onde vêm
4. Padrões de design a seguir
5. Edge cases e validações

Seja técnico e preciso. Foque em ESPECIFICAÇÃO, não implementação.`,
      baseContext
    );
    totalTokens += codeArchResult.tokens;
    totalCost += codeArchResult.costUsd;
    // Non-blocking agent message recording on hot path
    recordAgentMessage(ctx, {
      storyId: payload.storyId, subtaskId: payload.subtaskId,
      fromAgent: effectiveCodeArch, toAgent: effectiveDev,
      content: codeArchResult.content, messageType: "handoff",
      iteration: 1, tokens: codeArchResult.tokens, model: codeArchResult.model, stage: "execution",
    }).catch(() => {});

    // ──── Step 2: DEVELOPER ────
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
      `${baseContext}\n\n## Especificação do Code Architect:\n${codeArchResult.content}`
    );
    let codeContent = devResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
    totalTokens += devResult.tokens;
    totalCost += devResult.costUsd;
    // Non-blocking agent message recording on hot path
    recordAgentMessage(ctx, {
      storyId: payload.storyId, subtaskId: payload.subtaskId,
      fromAgent: effectiveDev, toAgent: effectiveIntegration,
      content: codeContent, messageType: "handoff",
      iteration: 1, tokens: devResult.tokens, model: devResult.model, stage: "execution",
    }).catch(() => {});

    // ──── Step 3: INTEGRATION AGENT ────
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

Verifique integração e retorne o código final (corrigido se necessário).`
    );
    totalTokens += integrationResult.tokens;
    totalCost += integrationResult.costUsd;

    const integrationCode = integrationResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
    if (integrationCode.length > 20 && !integrationCode.startsWith("{\"")) {
      codeContent = integrationCode;
    }

    await recordAgentMessage(ctx, {
      storyId: payload.storyId, subtaskId: payload.subtaskId,
      fromAgent: effectiveIntegration, toAgent: effectiveDev,
      content: integrationResult.content, messageType: "review",
      iteration: 1, tokens: integrationResult.tokens, model: integrationResult.model, stage: "execution",
    });

    // Override deterministic files
    const deterministicFiles: Record<string, string> = { ...DETERMINISTIC_FILES };
    if (deterministicFiles[payload.filePath]) codeContent = deterministicFiles[payload.filePath];
    if (payload.filePath === "package.json") codeContent = sanitizePackageJson(codeContent);

    // ── Persist subtask output ──
    await serviceClient.from("story_subtasks").update({
      output: codeContent, status: "completed", executed_at: new Date().toISOString(),
    }).eq("id", payload.subtaskId);

    // ── Create artifact ──
    const { data: artifact } = await serviceClient.from("agent_outputs").insert({
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
        chain: ["code_architect", "developer", "integration_agent"],
        wave: payload.waveNum,
      },
      model_used: devResult.model, prompt_used: payload.description,
      tokens_used: totalTokens, cost_estimate: totalCost,
    }).select("id").single();

    if (artifact?.id) {
      await serviceClient.from("code_artifacts").insert({
        output_id: artifact.id,
        files_affected: [{ path: payload.filePath, type: payload.fileType, language: ext }],
        build_status: "pending", test_status: "pending",
      });
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
    }, { model: devResult.model, costUsd: totalCost, durationMs: devResult.durationMs });

    return jsonResponse({
      success: true,
      filePath: payload.filePath,
      nodeId: payload.nodeId,
      artifactId: artifact?.id,
      codeContent,
      tokens: totalTokens,
      costUsd: totalCost,
      model: devResult.model,
    });

  } catch (e) {
    console.error("Worker error:", e);
    return jsonResponse({
      success: false,
      error: e instanceof Error ? e.message : "Unknown worker error",
    }, 500);
  }
});
