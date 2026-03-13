/**
 * OX-3: Consolidated Worker Prototype
 * 
 * Merges Code Architect + Developer into a single structured call,
 * keeping Integration Agent as a lighter validation pass.
 * 
 * 2-call design rationale:
 * - Architect output is never consumed externally; it only feeds the Developer
 * - Merging them eliminates one full AI roundtrip (~8-20s per file)
 * - Integration Agent remains separate because it needs the final code to validate
 * 
 * Feature-gated: only activates when useConsolidatedWorker=true in payload
 */

import { callAI, type AIResult } from "./ai-client.ts";
import { classifyIntegrationSeverity, type IntegrationSeverity } from "./integration-severity.ts";

export interface ConsolidatedMetrics {
  /** Which path was used */
  path: "consolidated_2call" | "standard_3call";
  /** Total AI latency across all calls */
  totalAiLatencyMs: number;
  /** Per-call latency breakdown */
  callLatencies: { role: string; durationMs: number; tokens: number }[];
  /** Total tokens */
  totalTokens: number;
  /** Total cost */
  totalCostUsd: number;
  /** Whether integration agent made changes (legacy) */
  integrationModified: boolean;
  /** OX-6: Severity classification */
  integrationSeverity: IntegrationSeverity;
  /** OX-6: Edit ratio (0-1) */
  integrationEditRatio: number;
  /** Output length in chars */
  outputLengthChars: number;
  /** Timestamp for comparison */
  startedAt: string;
  completedAt: string;
}

interface ConsolidatedCallParams {
  apiKey: string;
  filePath: string;
  fileType: string | null;
  language: string;
  isBackend: boolean;
  baseContext: string;
  contextStr: string;
  agentNames: {
    codeArchitect: string;
    developer: string;
    integrationAgent: string;
  };
}

interface ConsolidatedResult {
  codeContent: string;
  totalTokens: number;
  totalCostUsd: number;
  model: string;
  metrics: ConsolidatedMetrics;
  /** Raw results for audit/traceability */
  callResults: {
    merged?: AIResult;
    integration?: AIResult;
  };
}

/**
 * Execute the 2-call consolidated path:
 * Call 1: Merged Architect+Developer (spec + implement in one pass)
 * Call 2: Integration Agent (validate/fix)
 */
export async function executeConsolidatedPath(params: ConsolidatedCallParams): Promise<ConsolidatedResult> {
  const startedAt = new Date().toISOString();
  const callLatencies: ConsolidatedMetrics["callLatencies"] = [];
  let totalTokens = 0;
  let totalCost = 0;

  const backendRules = params.isBackend
    ? `\nREGRAS BACKEND:\n- schema (.sql): CREATE TABLE IF NOT EXISTS + RLS + prefixo de tabelas do projeto\n- edge_function: Deno/TS com CORS headers e auth\n- supabase_client: createClient com import.meta.env`
    : "";

  // ──── Call 1: Merged Architect + Developer ────
  const mergedResult = await callAI(
    params.apiKey,
    `Você é um engenheiro sênior no AxionOS combinando os papéis de Code Architect e Developer.

FASE 1 — ESPECIFICAÇÃO (pense internamente, não precisa exibir):
- Defina interfaces e tipos TypeScript necessários
- Determine contratos de função (parâmetros, retornos)  
- Identifique imports necessários e suas origens
- Considere padrões de design e edge cases

FASE 2 — IMPLEMENTAÇÃO (retorne apenas isto):
- Implemente o código COMPLETO baseado na especificação acima
- Retorne APENAS o conteúdo do arquivo, sem markdown, sem \`\`\`, sem explicações
- Código COMPLETO e FUNCIONAL
- Use shadcn/ui + Tailwind para frontend
${backendRules}

REGRAS package.json:
- NÃO inclua "shadcn/ui" como dependência
- Use "lucide-react" (não "lucide")
- SEMPRE inclua "type": "module"
- Use @vitejs/plugin-react-swc`,
    params.baseContext,
    false, 3, false, "execution", undefined, undefined, true, // skipEfficiency
  );

  totalTokens += mergedResult.tokens;
  totalCost += mergedResult.costUsd;
  callLatencies.push({
    role: "merged_architect_developer",
    durationMs: mergedResult.durationMs,
    tokens: mergedResult.tokens,
  });

  let codeContent = mergedResult.content
    .replace(/^```[\w]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();

  // ──── Call 2: Integration Agent (lighter validation) ────
  const integrationResult = await callAI(
    params.apiKey,
    `Você é o Integration Agent "${params.agentNames.integrationAgent}" no AxionOS.
Sua função é verificar e corrigir problemas de integração no código gerado:

1. IMPORTS: Todos os imports existem e apontam para arquivos corretos?
2. DEPENDÊNCIAS: O arquivo usa pacotes que estão no package.json?
3. TIPOS: Os tipos usados são compatíveis com as interfaces definidas?
4. CONEXÕES: APIs, hooks e serviços estão conectados corretamente?
5. CONSISTÊNCIA: O código segue os padrões dos outros arquivos do projeto?

Se encontrar problemas, retorne o código CORRIGIDO completo.
Se tudo estiver correto, retorne o código original sem alterações.

REGRA: Retorne APENAS o conteúdo do arquivo, sem markdown, sem \`\`\`, sem explicações.`,
    `## Arquivo: ${params.filePath}

## Código gerado:\n${codeContent.slice(0, 8000)}

## Arquivos já gerados (para verificar imports):\n${params.contextStr || "(nenhum)"}

Verifique integração e retorne o código final (corrigido se necessário).`,
    false, 3, false, "execution", undefined, undefined, true,
  );

  totalTokens += integrationResult.tokens;
  totalCost += integrationResult.costUsd;
  callLatencies.push({
    role: "integration_agent",
    durationMs: integrationResult.durationMs,
    tokens: integrationResult.tokens,
  });

  const integrationCode = integrationResult.content
    .replace(/^```[\w]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();

  let integrationModified = false;
  let integrationSeverity: IntegrationSeverity = "none";
  let integrationEditRatio = 0;

  if (integrationCode.length > 20 && !integrationCode.startsWith("{\"")) {
    const preIntegrationCode = codeContent;
    codeContent = integrationCode;
    const severity = classifyIntegrationSeverity(preIntegrationCode, integrationCode);
    integrationModified = severity.severity !== "none";
    integrationSeverity = severity.severity;
    integrationEditRatio = severity.editRatio;
  }

  const completedAt = new Date().toISOString();

  const metrics: ConsolidatedMetrics = {
    path: "consolidated_2call",
    totalAiLatencyMs: callLatencies.reduce((s, c) => s + c.durationMs, 0),
    callLatencies,
    totalTokens,
    totalCostUsd: totalCost,
    integrationModified,
    integrationSeverity,
    integrationEditRatio,
    outputLengthChars: codeContent.length,
    startedAt,
    completedAt,
  };

  return {
    codeContent,
    totalTokens,
    totalCostUsd: totalCost,
    model: mergedResult.model,
    metrics,
    callResults: { merged: mergedResult, integration: integrationResult },
  };
}

/**
 * Compute metrics for the standard 3-call path (for comparison).
 * Called after the standard path completes to capture equivalent metrics.
 */
export function buildStandardPathMetrics(
  archResult: AIResult,
  devResult: AIResult,
  integrationResult: AIResult,
  preIntegrationCode: string,
  codeContent: string,
  integrationModified: boolean,
  startedAt: string,
): ConsolidatedMetrics {
  const severity = classifyIntegrationSeverity(preIntegrationCode, codeContent);
  return {
    path: "standard_3call",
    totalAiLatencyMs: archResult.durationMs + devResult.durationMs + integrationResult.durationMs,
    callLatencies: [
      { role: "code_architect", durationMs: archResult.durationMs, tokens: archResult.tokens },
      { role: "developer", durationMs: devResult.durationMs, tokens: devResult.tokens },
      { role: "integration_agent", durationMs: integrationResult.durationMs, tokens: integrationResult.tokens },
    ],
    totalTokens: archResult.tokens + devResult.tokens + integrationResult.tokens,
    totalCostUsd: archResult.costUsd + devResult.costUsd + integrationResult.costUsd,
    integrationModified,
    integrationSeverity: severity.severity,
    integrationEditRatio: severity.editRatio,
    outputLengthChars: codeContent.length,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}
