/**
 * Architecture Subjob Optimization — Sprint 73
 * Token budgets, output guardrails, regression safety, optimization telemetry.
 */

import { estimateTokens } from "./diagnostics.ts";

// ─── Token Budgets ───

export interface SubjobBudget {
  preferredInputTokens: number;
  maxOutputChars: number;
  warnThresholdTokens: number;
}

export const SUBJOB_BUDGETS: Record<string, SubjobBudget> = {
  "architecture.system":       { preferredInputTokens: 1600, maxOutputChars: 8000, warnThresholdTokens: 2000 },
  "architecture.data":         { preferredInputTokens: 1100, maxOutputChars: 6000, warnThresholdTokens: 1400 },
  "architecture.api":          { preferredInputTokens: 1100, maxOutputChars: 6000, warnThresholdTokens: 1400 },
  "architecture.dependencies": { preferredInputTokens: 1200, maxOutputChars: 5000, warnThresholdTokens: 1500 },
  "architecture.synthesis":    { preferredInputTokens: 0,    maxOutputChars: 0,    warnThresholdTokens: 0 },
};

export interface BudgetCheckResult {
  subjobKey: string;
  inputTokens: number;
  budgetTokens: number;
  overBudget: boolean;
  overBudgetBy: number;
  status: "within_budget" | "warning" | "over_budget";
}

export function checkInputBudget(subjobKey: string, promptChars: number, contextChars: number): BudgetCheckResult {
  const budget = SUBJOB_BUDGETS[subjobKey];
  if (!budget || budget.preferredInputTokens === 0) {
    return { subjobKey, inputTokens: 0, budgetTokens: 0, overBudget: false, overBudgetBy: 0, status: "within_budget" };
  }
  const inputTokens = estimateTokens(promptChars + contextChars);
  const overBudgetBy = Math.max(0, inputTokens - budget.preferredInputTokens);
  let status: BudgetCheckResult["status"] = "within_budget";
  if (inputTokens > budget.warnThresholdTokens) status = "over_budget";
  else if (inputTokens > budget.preferredInputTokens) status = "warning";
  return { subjobKey, inputTokens, budgetTokens: budget.preferredInputTokens, overBudget: overBudgetBy > 0, overBudgetBy, status };
}

// ─── Output Guardrails ───

export interface OutputGuardrailResult {
  subjobKey: string;
  outputChars: number;
  maxChars: number;
  exceeded: boolean;
  exceededBy: number;
}

export function checkOutputGuardrail(subjobKey: string, outputChars: number): OutputGuardrailResult {
  const budget = SUBJOB_BUDGETS[subjobKey];
  if (!budget || budget.maxOutputChars === 0) {
    return { subjobKey, outputChars, maxChars: 0, exceeded: false, exceededBy: 0 };
  }
  const exceededBy = Math.max(0, outputChars - budget.maxOutputChars);
  return { subjobKey, outputChars, maxChars: budget.maxOutputChars, exceeded: exceededBy > 0, exceededBy };
}

// ─── Regression Safety ───

export interface RegressionCheck {
  subjobKey: string;
  checks: Array<{ field: string; present: boolean; sufficient: boolean }>;
  passed: boolean;
  warnings: string[];
}

export function checkRegressionSafety(subjobKey: string, result: Record<string, unknown>): RegressionCheck {
  const checks: Array<{ field: string; present: boolean; sufficient: boolean }> = [];
  const warnings: string[] = [];

  switch (subjobKey) {
    case "architecture.system": {
      const stack = result.stack as Record<string, unknown> | undefined;
      checks.push({ field: "stack", present: !!stack, sufficient: !!stack && Object.keys(stack).length >= 3 });
      checks.push({ field: "layers", present: Array.isArray(result.layers), sufficient: (result.layers as any[])?.length >= 2 });
      checks.push({ field: "project_structure", present: !!result.project_structure, sufficient: !!result.project_structure });
      break;
    }
    case "architecture.data": {
      const tables = result.tables as any[] | undefined;
      checks.push({ field: "tables", present: Array.isArray(tables), sufficient: (tables?.length || 0) >= 2 });
      checks.push({ field: "relationships", present: Array.isArray(result.relationships), sufficient: (result.relationships as any[])?.length >= 1 });
      if (tables) {
        const hasColumns = tables.every((t: any) => Array.isArray(t.columns) && t.columns.length >= 2);
        checks.push({ field: "table_columns", present: true, sufficient: hasColumns });
      }
      break;
    }
    case "architecture.api": {
      const endpoints = result.endpoints as any[] | undefined;
      checks.push({ field: "endpoints", present: Array.isArray(endpoints), sufficient: (endpoints?.length || 0) >= 2 });
      checks.push({ field: "auth_strategy", present: !!result.auth_strategy, sufficient: !!result.auth_strategy });
      break;
    }
    case "architecture.dependencies": {
      const depGraph = result.dependency_graph as Record<string, unknown> | undefined;
      checks.push({ field: "dependency_graph", present: !!depGraph, sufficient: !!depGraph });
      checks.push({ field: "generation_order", present: Array.isArray(result.generation_order), sufficient: (result.generation_order as any[])?.length >= 1 });
      checks.push({ field: "npm_dependencies", present: Array.isArray(result.npm_dependencies), sufficient: (result.npm_dependencies as any[])?.length >= 1 });
      break;
    }
  }

  for (const c of checks) {
    if (!c.present) warnings.push(`Missing: ${c.field}`);
    else if (!c.sufficient) warnings.push(`Insufficient: ${c.field} — may be too thin for downstream`);
  }

  return { subjobKey, checks, passed: warnings.length === 0, warnings };
}

// ─── Optimization Telemetry ───

export interface OptimizationDelta {
  subjobKey: string;
  previousInputTokens: number | null;
  optimizedInputTokens: number;
  tokenReduction: number | null;
  tokenReductionPct: number | null;
  previousDurationMs: number | null;
  optimizedDurationMs: number;
  durationReductionMs: number | null;
  durationReductionPct: number | null;
  budgetStatus: BudgetCheckResult["status"];
  outputGuardrailExceeded: boolean;
  regressionPassed: boolean;
  regressionWarnings: string[];
}

export function computeOptimizationDelta(
  subjobKey: string,
  previousRun: { inputTokens: number; durationMs: number } | null,
  currentRun: { promptChars: number; contextChars: number; durationMs: number; outputChars: number; result: Record<string, unknown> },
): OptimizationDelta {
  const inputTokens = estimateTokens(currentRun.promptChars + currentRun.contextChars);
  const budgetCheck = checkInputBudget(subjobKey, currentRun.promptChars, currentRun.contextChars);
  const guardrail = checkOutputGuardrail(subjobKey, currentRun.outputChars);
  const regression = checkRegressionSafety(subjobKey, currentRun.result);

  return {
    subjobKey,
    previousInputTokens: previousRun?.inputTokens ?? null,
    optimizedInputTokens: inputTokens,
    tokenReduction: previousRun ? previousRun.inputTokens - inputTokens : null,
    tokenReductionPct: previousRun && previousRun.inputTokens > 0
      ? Math.round(((previousRun.inputTokens - inputTokens) / previousRun.inputTokens) * 100)
      : null,
    previousDurationMs: previousRun?.durationMs ?? null,
    optimizedDurationMs: currentRun.durationMs,
    durationReductionMs: previousRun ? previousRun.durationMs - currentRun.durationMs : null,
    durationReductionPct: previousRun && previousRun.durationMs > 0
      ? Math.round(((previousRun.durationMs - currentRun.durationMs) / previousRun.durationMs) * 100)
      : null,
    budgetStatus: budgetCheck.status,
    outputGuardrailExceeded: guardrail.exceeded,
    regressionPassed: regression.passed,
    regressionWarnings: regression.warnings,
  };
}

// ─── Compact Intermediate Summary ───

export interface CompactIntermediateSummary {
  domain_purpose: string;
  core_entities: string[];
  main_flows: string[];
  stack_runtime: string;
  critical_constraints: string[];
}

export function buildIntermediateSummary(
  projectContext: string,
  systemResult: Record<string, unknown> | null,
): CompactIntermediateSummary {
  const stack = (systemResult?.stack as Record<string, any>) || {};
  const patterns = (systemResult?.architecture_patterns as string[]) || [];

  // Extract domain purpose from project context (first line)
  const lines = projectContext.split("\n").filter(l => l.trim());
  const domainPurpose = lines[0]?.replace("Projeto: ", "") || "unknown";

  // Extract core entities from layers
  const layers = (systemResult?.layers as Array<{ name: string }>) || [];
  const coreEntities = layers.slice(0, 4).map(l => l.name);

  // Main flows from patterns
  const mainFlows = patterns.slice(0, 3);

  // Stack/runtime compact
  const fe = (stack.frontend as any)?.framework || "React";
  const be = (stack.backend as any)?.platform || "Supabase";
  const db = (stack.database as any)?.provider || "PostgreSQL";
  const stackRuntime = `${fe}+${be}+${db}`;

  // Constraints
  const security = (systemResult?.security_measures as string[]) || [];
  const constraints = security.slice(0, 3);

  return {
    domain_purpose: domainPurpose.slice(0, 100),
    core_entities: coreEntities,
    main_flows: mainFlows,
    stack_runtime: stackRuntime,
    critical_constraints: constraints,
  };
}

export function serializeIntermediateSummary(summary: CompactIntermediateSummary): string {
  return JSON.stringify(summary);
}
