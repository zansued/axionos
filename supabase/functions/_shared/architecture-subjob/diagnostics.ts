/**
 * Architecture Subjob Diagnostics — Sprint 72
 * Per-attempt diagnostic tracking, failure classification, bottleneck analysis,
 * and timing breakdown (provider, parse, persist).
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Failure Type Classification ───
export type FailureType =
  | "failed_timeout"
  | "failed_provider"
  | "failed_parse"
  | "failed_persistence"
  | "failed_cleanup"
  | "failed_unknown";

export interface AttemptDiagnostic {
  attempt_number: number;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  model: string | null;
  prompt_size_chars: number;
  context_size_chars: number;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  provider_latency_ms: number | null;
  parse_ms: number | null;
  persist_ms: number | null;
  parse_status: "success" | "failed" | "skipped";
  persist_status: "success" | "failed" | "skipped";
  terminal_status: string;
  failure_type: FailureType | null;
  failure_reason: string | null;
  retry_trigger: "auto_timeout" | "auto_parse" | "manual" | null;
}

/** Estimate token count from character count (~4 chars/token for mixed content) */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

/** Classify failure type from error message */
export function classifyFailure(error: string): FailureType {
  const lower = error.toLowerCase();
  if (lower.includes("timeout") || lower.includes("exceeded")) return "failed_timeout";
  if (lower.includes("rate limit") || lower.includes("429") || lower.includes("503") || lower.includes("502") || lower.includes("provider")) return "failed_provider";
  if (lower.includes("json") || lower.includes("parse") || lower.includes("unexpected token") || lower.includes("syntaxerror")) return "failed_parse";
  if (lower.includes("persist") || lower.includes("insert") || lower.includes("update") || lower.includes("database")) return "failed_persistence";
  if (lower.includes("cleanup") || lower.includes("stuck")) return "failed_cleanup";
  return "failed_unknown";
}

/** Create a diagnostic record for a single attempt */
export function createAttemptDiagnostic(params: {
  attemptNumber: number;
  startedAt: string;
  model: string | null;
  promptSizeChars: number;
  contextSizeChars: number;
  outputChars: number;
  providerLatencyMs: number | null;
  parseMs: number | null;
  persistMs: number | null;
  durationMs: number;
  parseStatus: "success" | "failed" | "skipped";
  persistStatus: "success" | "failed" | "skipped";
  terminalStatus: string;
  error: string | null;
  retryTrigger: "auto_timeout" | "auto_parse" | "manual" | null;
}): AttemptDiagnostic {
  const finishedAt = new Date().toISOString();
  return {
    attempt_number: params.attemptNumber,
    started_at: params.startedAt,
    finished_at: finishedAt,
    duration_ms: params.durationMs,
    model: params.model,
    prompt_size_chars: params.promptSizeChars,
    context_size_chars: params.contextSizeChars,
    estimated_input_tokens: estimateTokens(params.promptSizeChars),
    estimated_output_tokens: estimateTokens(params.outputChars),
    provider_latency_ms: params.providerLatencyMs,
    parse_ms: params.parseMs,
    persist_ms: params.persistMs,
    parse_status: params.parseStatus,
    persist_status: params.persistStatus,
    terminal_status: params.terminalStatus,
    failure_type: params.error ? classifyFailure(params.error) : null,
    failure_reason: params.error,
    retry_trigger: params.retryTrigger,
  };
}

/** Append a diagnostic entry to the subjob's diagnostics_log */
export async function appendDiagnostic(
  client: SupabaseClient,
  subjobId: string,
  diagnostic: AttemptDiagnostic,
  failureType: FailureType | null,
  retryTrigger: string | null,
  promptSizeChars: number,
  contextSizeChars: number,
): Promise<void> {
  const { data } = await client
    .from("pipeline_subjobs")
    .select("diagnostics_log")
    .eq("id", subjobId)
    .single();

  const currentLog = Array.isArray(data?.diagnostics_log) ? data.diagnostics_log : [];
  currentLog.push(diagnostic);

  await client
    .from("pipeline_subjobs")
    .update({
      diagnostics_log: currentLog,
      failure_type: failureType,
      retry_trigger: retryTrigger,
      prompt_size_chars: promptSizeChars,
      context_size_chars: contextSizeChars,
    })
    .eq("id", subjobId);
}

// ─── Compact Architecture Summaries ───

/** Generate a minimal structured summary from System Architect output for downstream agents */
export function compactSystemArchSummary(systemResult: Record<string, unknown>): string {
  const stack = systemResult.stack as Record<string, unknown> | undefined;
  const patterns = (systemResult.architecture_patterns as string[]) || [];
  const layers = (systemResult.layers as Array<{ name: string; responsibility: string }>) || [];

  const summary: Record<string, unknown> = {
    stack_summary: stack ? {
      frontend: (stack.frontend as any)?.framework || "unknown",
      backend: (stack.backend as any)?.type || "unknown",
      database: (stack.database as any)?.provider || "unknown",
      auth: (stack.auth as any)?.method || "unknown",
    } : null,
    patterns: patterns.slice(0, 5),
    layers: layers.slice(0, 5).map(l => `${l.name}: ${l.responsibility}`),
    project_structure: systemResult.project_structure ? "defined" : "not_defined",
  };

  return JSON.stringify(summary);
}

/** Compact Data Architect output for dependency planner */
export function compactDataArchSummary(dataResult: Record<string, unknown>): string {
  const tables = (dataResult.tables as any[]) || [];
  const relationships = (dataResult.relationships as any[]) || [];
  return JSON.stringify({
    tables: tables.slice(0, 6).map((t: any) => ({
      name: t.name,
      columns: (t.columns as any[] || []).map((c: any) => c.name),
    })),
    relationships: relationships.slice(0, 6).map((r: any) => `${r.from_table}.${r.from_column} → ${r.to_table}.${r.to_column}`),
    enums: (dataResult.enums as any[] || []).map((e: any) => e.name),
  });
}

/** Compact API Architect output for dependency planner */
export function compactApiArchSummary(apiResult: Record<string, unknown>): string {
  const endpoints = (apiResult.endpoints as any[]) || [];
  const edgeFns = (apiResult.edge_functions as any[]) || [];
  return JSON.stringify({
    endpoints: endpoints.slice(0, 8).map((e: any) => `${e.method} ${e.path}`),
    edge_functions: edgeFns.slice(0, 4).map((f: any) => f.name),
    realtime: (apiResult.realtime_channels as any[] || []).map((c: any) => c.name),
  });
}

// ─── Bottleneck Analysis ───

export interface BottleneckSummary {
  likely_bottlenecks: string[];
  largest_prompts: Array<{ subjob: string; chars: number; est_tokens: number }>;
  longest_stages: Array<{ subjob: string; duration_ms: number }>;
  most_frequent_failure_type: string | null;
  failure_type_counts: Record<string, number>;
  recommended_next_action: string;
  total_attempts: number;
  total_retries: number;
}

export function analyzeBottlenecks(
  subjobs: Array<{
    subjob_key: string;
    status: string;
    duration_ms: number | null;
    prompt_size_chars: number | null;
    context_size_chars: number | null;
    diagnostics_log: AttemptDiagnostic[] | null;
    failure_type: string | null;
    attempt_number: number | null;
  }>
): BottleneckSummary {
  const bottlenecks: string[] = [];
  const failureCounts: Record<string, number> = {};
  let totalAttempts = 0;
  let totalRetries = 0;

  for (const s of subjobs) {
    const logs = Array.isArray(s.diagnostics_log) ? s.diagnostics_log : [];
    totalAttempts += logs.length || 1;
    totalRetries += Math.max(0, (s.attempt_number || 1) - 1);

    for (const log of logs) {
      if (log.failure_type) {
        failureCounts[log.failure_type] = (failureCounts[log.failure_type] || 0) + 1;
      }
    }
    if (s.failure_type) {
      failureCounts[s.failure_type] = (failureCounts[s.failure_type] || 0) + 1;
    }
  }

  const promptSizes = subjobs
    .filter(s => (s.prompt_size_chars || 0) > 0)
    .map(s => ({ subjob: s.subjob_key, chars: s.prompt_size_chars || 0, est_tokens: estimateTokens(s.prompt_size_chars || 0) }))
    .sort((a, b) => b.chars - a.chars);

  const durations = subjobs
    .filter(s => (s.duration_ms || 0) > 0)
    .map(s => ({ subjob: s.subjob_key, duration_ms: s.duration_ms || 0 }))
    .sort((a, b) => b.duration_ms - a.duration_ms);

  if (promptSizes.length > 0 && promptSizes[0].est_tokens > 3000) {
    bottlenecks.push(`Large prompt in ${promptSizes[0].subjob}: ~${promptSizes[0].est_tokens} tokens`);
  }
  if (durations.length > 0 && durations[0].duration_ms > 60000) {
    bottlenecks.push(`Slow execution in ${durations[0].subjob}: ${(durations[0].duration_ms / 1000).toFixed(1)}s`);
  }
  if (totalRetries > 2) {
    bottlenecks.push(`High retry count: ${totalRetries} retries across ${subjobs.length} subjobs`);
  }

  const sortedFailures = Object.entries(failureCounts).sort((a, b) => b[1] - a[1]);
  const mostFrequent = sortedFailures.length > 0 ? sortedFailures[0][0] : null;

  if (mostFrequent === "failed_timeout") {
    bottlenecks.push("Timeouts are the primary failure mode");
  } else if (mostFrequent === "failed_parse") {
    bottlenecks.push("JSON parse failures indicate model output quality issues");
  } else if (mostFrequent === "failed_provider") {
    bottlenecks.push("Provider errors suggest rate limiting or service degradation");
  }

  let recommendation = "No immediate action needed — pipeline is healthy.";
  if (mostFrequent === "failed_timeout") {
    recommendation = "Consider increasing timeouts or compressing prompts further. Check if provider latency has degraded.";
  } else if (mostFrequent === "failed_parse") {
    recommendation = "Add structured output hints or switch to a model with better JSON adherence (GPT-5-Mini).";
  } else if (mostFrequent === "failed_provider") {
    recommendation = "Check provider status. Consider switching to fallback provider or adding circuit breaker.";
  } else if (totalRetries > 3) {
    recommendation = "Retry storm detected. Review root cause before increasing retry limits.";
  } else if (promptSizes.length > 0 && promptSizes[0].est_tokens > 4000) {
    recommendation = "Largest prompt exceeds 4k tokens. Use compact context summaries for downstream agents.";
  }

  return {
    likely_bottlenecks: bottlenecks,
    largest_prompts: promptSizes.slice(0, 3),
    longest_stages: durations.slice(0, 3),
    most_frequent_failure_type: mostFrequent,
    failure_type_counts: failureCounts,
    recommended_next_action: recommendation,
    total_attempts: totalAttempts,
    total_retries: totalRetries,
  };
}
