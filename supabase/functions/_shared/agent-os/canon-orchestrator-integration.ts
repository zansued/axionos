/**
 * Canon–Orchestrator Integration — Sprint 122 / Sprint 139
 *
 * Connects the Canon / Pattern Library to the AgentOS Orchestrator.
 * Before agent dispatch, retrieves relevant canon knowledge based on
 * stage, initiative context, stack, and problem type, then injects
 * it into the execution context.
 *
 * Sprint 139: Replaced stub retrieveCanonKnowledge with real DB-backed retrieval.
 *
 * Architectural rule:
 *   Canon informs → Orchestrator consumes → Agents receive knowledge.
 *   Canon never triggers actions. Orchestrator never bypasses Canon in governed flows.
 */

import type { StageName, WorkInput } from "./types.ts";
import type { RetrievalQuery } from "../canon-runtime/canon-runtime-retriever.ts";
import { buildRetrievalFilters, defaultRetrievalQuery } from "../canon-runtime/canon-runtime-retriever.ts";
import { buildCanonContext, type CanonContextInput, type CanonContext } from "../canon-runtime/canon-context-builder.ts";

// ── Stage-to-Canon Mapping ──

export interface StageCanonProfile {
  preferred_practice_types: string[];
  preferred_domains: string[];
  max_entries: number;
  confidence_threshold: number;
}

const STAGE_CANON_PROFILES: Record<string, StageCanonProfile> = {
  perception: {
    preferred_practice_types: ["playbook", "research_pattern", "validation_guidance", "methodology_guideline"],
    preferred_domains: ["discovery", "market_analysis", "opportunity_validation"],
    max_entries: 5,
    confidence_threshold: 0.4,
  },
  design: {
    preferred_practice_types: ["architecture_pattern", "template", "convention", "infrastructure_pattern", "best_practice"],
    preferred_domains: ["architecture", "system_design", "data_modeling"],
    max_entries: 8,
    confidence_threshold: 0.5,
  },
  build: {
    preferred_practice_types: ["implementation_pattern", "code_convention", "template", "checklist"],
    preferred_domains: ["engineering", "implementation", "code_generation"],
    max_entries: 10,
    confidence_threshold: 0.5,
  },
  validation: {
    preferred_practice_types: ["validation_rule", "checklist", "anti_pattern", "runtime_guardrail"],
    preferred_domains: ["testing", "quality", "deployment", "delivery"],
    max_entries: 8,
    confidence_threshold: 0.4,
  },
  evolution: {
    preferred_practice_types: ["recovery_pattern", "error_convention", "troubleshooting_rule", "deployment_rule"],
    preferred_domains: ["repair", "recovery", "runtime", "delivery"],
    max_entries: 6,
    confidence_threshold: 0.5,
  },
};

// ── Knowledge Packet ──

export interface CanonKnowledgePacket {
  canon_entry_id: string;
  title: string;
  category: string;
  practice_type: string;
  summary: string;
  guidance: string;
  confidence: number;
  approval_status: string;
  match_reason: string;
  suggested_use: string;
  source_reference: string;
  stack_scope: string;
  tags: unknown;
  anti_pattern_flag: boolean;
}

// ── Canon Retrieval Result ──

export interface CanonRetrievalRequest {
  stage: string;
  query: RetrievalQuery;
  filters: ReturnType<typeof buildRetrievalFilters>;
  canon_context: CanonContext;
  organization_id?: string;
  timestamp: string;
}

export interface CanonRetrievalResult {
  success: boolean;
  entries_retrieved: number;
  pattern_ids: string[];
  categories_used: string[];
  confidence_scores: number[];
  knowledge_context: Record<string, unknown>;
  knowledge_packets: CanonKnowledgePacket[];
  retrieval_request: CanonRetrievalRequest;
  retrieval_type: "db_query" | "fallback_empty" | "error";
  error?: string;
}

export interface CanonTraceRecord {
  canon_retrieval_attempted: boolean;
  canon_retrieval_success: boolean;
  entries_retrieved: number;
  pattern_ids_used: string[];
  categories_used: string[];
  average_confidence: number;
  stage: string;
  retrieval_type: string;
  timestamp: string;
  error?: string;
}

// ── Core Functions ──

/**
 * Build a stage-aware canon retrieval request.
 */
export function buildCanonRetrievalRequest(
  stage: StageName,
  input: WorkInput,
): CanonRetrievalRequest {
  const profile = STAGE_CANON_PROFILES[stage] || STAGE_CANON_PROFILES["build"];

  const contextData = input.context || {};
  const stack = (contextData.stack as string) || undefined;
  const language = (contextData.language as string) || undefined;
  const problemType = (contextData.problem_type as string) || undefined;
  const tags = (contextData.tags as string[]) || [];
  const organizationId = (contextData.organization_id as string) || undefined;

  // Build retrieval query
  const query: RetrievalQuery = {
    ...defaultRetrievalQuery(),
    domain: profile.preferred_domains[0],
    stack: stack || language,
    practice_type: profile.preferred_practice_types[0],
    topic: problemType,
    min_confidence: profile.confidence_threshold,
    max_results: profile.max_entries,
  };

  // Build canon context for agent injection
  const canonContextInput: CanonContextInput = {
    agent_type: stageToAgentType(stage),
    task_type: stage,
    domain_hints: [...profile.preferred_domains, ...(tags || [])],
    stack_hints: [stack, language].filter(Boolean) as string[],
    practice_type_hints: profile.preferred_practice_types,
  };

  const canonContext = buildCanonContext(canonContextInput);
  const filters = buildRetrievalFilters(query);

  return {
    stage,
    query,
    filters,
    canon_context: canonContext,
    organization_id: organizationId,
    timestamp: new Date().toISOString(),
  };
}

// ── Supabase Client Type (minimal interface for edge functions) ──

interface SupabaseQueryClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): any;
      neq(column: string, value: unknown): any;
      in(column: string, values: unknown[]): any;
      gte(column: string, value: unknown): any;
      order(column: string, options: { ascending: boolean }): any;
      limit(count: number): any;
    };
  };
}

/**
 * Sprint 139 — Real Canon Knowledge Retrieval
 *
 * Queries canon_entries from the database using the retrieval request
 * built by the integration layer. Applies ranking by confidence,
 * filters by lifecycle/approval status, and returns structured
 * knowledge packets for agent context injection.
 *
 * Safe fallback: if retrieval fails or no client provided, returns
 * empty result with metadata so execution continues.
 */
export async function retrieveCanonKnowledge(
  request: CanonRetrievalRequest,
  supabaseClient?: SupabaseQueryClient,
): Promise<CanonRetrievalResult> {
  const emptyResult = (type: "fallback_empty" | "error", error?: string): CanonRetrievalResult => ({
    success: type !== "error",
    entries_retrieved: 0,
    pattern_ids: [],
    categories_used: request.canon_context.required_practice_types,
    confidence_scores: [],
    knowledge_context: {
      canon_available: false,
      retrieval_posture: request.canon_context.fallback_posture,
      stage: request.stage,
      domains_queried: request.canon_context.required_domains,
      practice_types_queried: request.canon_context.required_practice_types,
    },
    knowledge_packets: [],
    retrieval_request: request,
    retrieval_type: type,
    error,
  });

  // ── Guard: no client → graceful fallback ──
  if (!supabaseClient) {
    console.warn("[Canon Retrieval] No supabaseClient provided — falling back to empty retrieval");
    return emptyResult("fallback_empty", "no_supabase_client");
  }

  // ── Guard: no organization_id → cannot scope query ──
  if (!request.organization_id) {
    console.warn("[Canon Retrieval] No organization_id in request — falling back to empty retrieval");
    return emptyResult("fallback_empty", "no_organization_id");
  }

  try {
    // ── Build query against canon_entries ──
    const practiceTypes = request.canon_context.required_practice_types;
    const confidenceThreshold = request.canon_context.confidence_threshold;
    const maxEntries = request.canon_context.max_entries;

    let query = supabaseClient
      .from("canon_entries")
      .select("id, title, summary, body, practice_type, canon_type, stack_scope, layer_scope, problem_scope, confidence_score, approval_status, lifecycle_status, implementation_guidance, structured_guidance, source_reference, tags, anti_pattern_flag, applicability_scope, topic, subtopic, code_snippet")
      .eq("organization_id", request.organization_id)
      .neq("lifecycle_status", "deprecated")
      .neq("lifecycle_status", "superseded")
      .gte("confidence_score", confidenceThreshold);

    // Filter by practice types if available
    if (practiceTypes.length > 0) {
      query = query.in("practice_type", practiceTypes);
    }

    // Filter by stack scope if provided in the request
    if (request.query.stack) {
      query = query.eq("stack_scope", request.query.stack);
    }

    // Filter by topic if provided
    if (request.query.topic) {
      query = query.eq("topic", request.query.topic);
    }

    // Order by confidence (best first), limit results
    query = query
      .order("confidence_score", { ascending: false })
      .limit(maxEntries);

    const { data: entries, error: dbError } = await query;

    if (dbError) {
      console.error("[Canon Retrieval] DB query error:", dbError.message);
      return emptyResult("error", `db_error: ${dbError.message}`);
    }

    if (!entries || entries.length === 0) {
      // ── Broaden: retry without stack/topic filters ──
      let broadQuery = supabaseClient
        .from("canon_entries")
        .select("id, title, summary, body, practice_type, canon_type, stack_scope, layer_scope, problem_scope, confidence_score, approval_status, lifecycle_status, implementation_guidance, structured_guidance, source_reference, tags, anti_pattern_flag, applicability_scope, topic, subtopic, code_snippet")
        .eq("organization_id", request.organization_id)
        .neq("lifecycle_status", "deprecated")
        .neq("lifecycle_status", "superseded")
        .gte("confidence_score", confidenceThreshold);

      if (practiceTypes.length > 0) {
        broadQuery = broadQuery.in("practice_type", practiceTypes);
      }

      broadQuery = broadQuery
        .order("confidence_score", { ascending: false })
        .limit(maxEntries);

      const { data: broadEntries, error: broadError } = await broadQuery;

      if (broadError || !broadEntries || broadEntries.length === 0) {
        console.log(`[Canon Retrieval] No entries found for stage=${request.stage}, org=${request.organization_id}`);
        return emptyResult("fallback_empty");
      }

      return buildRetrievalResultFromEntries(broadEntries, request, "broad_match");
    }

    return buildRetrievalResultFromEntries(entries, request, "precise_match");
  } catch (error) {
    console.error("[Canon Retrieval] Unexpected error:", error instanceof Error ? error.message : String(error));
    return emptyResult("error", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Transform raw DB rows into a structured CanonRetrievalResult with knowledge packets.
 */
function buildRetrievalResultFromEntries(
  entries: Record<string, any>[],
  request: CanonRetrievalRequest,
  matchType: string,
): CanonRetrievalResult {
  // ── Rank entries ──
  const ranked = entries
    .map((entry) => ({
      entry,
      score: computeEntryRelevance(entry, request),
    }))
    .sort((a, b) => b.score - a.score);

  // ── Build knowledge packets ──
  const packets: CanonKnowledgePacket[] = ranked.map(({ entry, score }) => ({
    canon_entry_id: entry.id,
    title: entry.title,
    category: entry.canon_type || entry.practice_type,
    practice_type: entry.practice_type,
    summary: entry.summary,
    guidance: entry.implementation_guidance || entry.body?.substring(0, 500) || "",
    confidence: entry.confidence_score,
    approval_status: entry.approval_status,
    match_reason: buildMatchReason(entry, request, matchType),
    suggested_use: buildSuggestedUse(entry, request.stage),
    source_reference: entry.source_reference || "",
    stack_scope: entry.stack_scope || "",
    tags: entry.tags || [],
    anti_pattern_flag: entry.anti_pattern_flag || false,
  }));

  const patternIds = packets.map((p) => p.canon_entry_id);
  const categories = [...new Set(packets.map((p) => p.practice_type))];
  const confidenceScores = packets.map((p) => p.confidence);

  console.log(
    `[Canon Retrieval] SUCCESS: stage=${request.stage}, entries=${packets.length}, ` +
    `categories=[${categories.join(",")}], match=${matchType}, ` +
    `avg_confidence=${confidenceScores.length > 0 ? (confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length).toFixed(2) : 0}`
  );

  return {
    success: true,
    entries_retrieved: packets.length,
    pattern_ids: patternIds,
    categories_used: categories,
    confidence_scores: confidenceScores,
    knowledge_context: {
      canon_available: true,
      retrieval_posture: "knowledge_enriched",
      stage: request.stage,
      domains_queried: request.canon_context.required_domains,
      practice_types_queried: request.canon_context.required_practice_types,
      match_type: matchType,
      packets_summary: packets.map((p) => ({
        id: p.canon_entry_id,
        title: p.title,
        practice_type: p.practice_type,
        confidence: p.confidence,
        anti_pattern: p.anti_pattern_flag,
      })),
    },
    knowledge_packets: packets,
    retrieval_request: request,
    retrieval_type: "db_query",
  };
}

/**
 * Compute relevance score for a canon entry relative to the retrieval request.
 * Higher = more relevant.
 */
function computeEntryRelevance(entry: Record<string, any>, request: CanonRetrievalRequest): number {
  let score = entry.confidence_score || 0;

  // Boost: approved entries
  if (entry.approval_status === "approved") score += 0.15;
  else if (entry.approval_status === "experimental") score += 0.05;

  // Boost: practice type match
  if (request.canon_context.required_practice_types.includes(entry.practice_type)) {
    score += 0.1;
  }

  // Boost: stack match
  if (request.query.stack && entry.stack_scope === request.query.stack) {
    score += 0.1;
  }

  // Boost: topic match
  if (request.query.topic && entry.topic === request.query.topic) {
    score += 0.1;
  }

  // Penalty: anti-patterns get lower priority unless validation stage
  if (entry.anti_pattern_flag && request.stage !== "validation") {
    score -= 0.1;
  }

  return Math.round(Math.min(score, 1.0) * 100) / 100;
}

/**
 * Build a human-readable match reason.
 */
function buildMatchReason(entry: Record<string, any>, request: CanonRetrievalRequest, matchType: string): string {
  const reasons: string[] = [];
  if (request.canon_context.required_practice_types.includes(entry.practice_type)) {
    reasons.push(`practice_type=${entry.practice_type}`);
  }
  if (request.query.stack && entry.stack_scope === request.query.stack) {
    reasons.push(`stack=${entry.stack_scope}`);
  }
  if (request.query.topic && entry.topic === request.query.topic) {
    reasons.push(`topic=${entry.topic}`);
  }
  if (entry.approval_status === "approved") {
    reasons.push("approved");
  }
  if (reasons.length === 0) reasons.push(matchType);
  return reasons.join(", ");
}

/**
 * Suggest how the agent should use this entry based on stage.
 */
function buildSuggestedUse(entry: Record<string, any>, stage: string): string {
  if (entry.anti_pattern_flag) return "Avoid this pattern — use as a negative reference";
  const stageHints: Record<string, string> = {
    perception: "Use as research guidance or discovery heuristic",
    design: "Apply as architectural reference or structural template",
    build: "Use as implementation pattern or code convention",
    validation: "Apply as validation rule or quality checklist item",
    evolution: "Use as recovery pattern or troubleshooting guide",
  };
  return stageHints[stage] || "Use as general implementation guidance";
}

/**
 * Inject canon knowledge into the WorkInput context.
 * Returns a new WorkInput with canon context merged.
 */
export function injectCanonIntoWorkInput(
  input: WorkInput,
  result: CanonRetrievalResult,
): WorkInput {
  // Sprint 140: Use formatted, agent-friendly canon context
  const agentFriendlyCanon = formatCanonForAgentContext(result.knowledge_packets);

  return {
    ...input,
    context: {
      ...input.context,
      canon_knowledge: result.knowledge_context,
      canon_entries_count: result.entries_retrieved,
      canon_pattern_ids: result.pattern_ids,
      canon_retrieval_success: result.success,
      canon_categories_used: result.categories_used,
      canon_retrieval_type: result.retrieval_type,
      // Sprint 139: inject full knowledge packets for agent consumption
      canon_knowledge_packets: result.knowledge_packets,
      // Sprint 140: structured, clearly labeled canon for agent use
      canon_agent_context: agentFriendlyCanon,
    },
  };
}

/**
 * Build a trace record for observability and audit.
 */
export function buildCanonTraceRecord(
  stage: StageName,
  result: CanonRetrievalResult,
): CanonTraceRecord {
  const avgConfidence = result.confidence_scores.length > 0
    ? result.confidence_scores.reduce((a, b) => a + b, 0) / result.confidence_scores.length
    : 0;

  return {
    canon_retrieval_attempted: true,
    canon_retrieval_success: result.success,
    entries_retrieved: result.entries_retrieved,
    pattern_ids_used: result.pattern_ids,
    categories_used: result.categories_used,
    average_confidence: avgConfidence,
    stage,
    retrieval_type: result.retrieval_type,
    timestamp: new Date().toISOString(),
    error: result.error,
  };
}
// ── Canon Consumption Contract — Sprint 140 ──

export type CanonUsageMode = "none" | "referenced" | "applied" | "rejected" | "ignored" | "malformed";

export interface CanonConsumptionReport {
  canon_context_available: boolean;
  canon_packet_ids_available: string[];
  canon_packet_ids_used: string[];
  canon_categories_used: string[];
  canon_usage_mode: CanonUsageMode;
  canon_usage_explanation: string;
  agent_id?: string;
  stage?: string;
}

export interface CanonConsumptionTrace {
  stage: string;
  run_id: string;
  total_packets_available: number;
  total_packets_used: number;
  total_packets_ignored: number;
  usage_rate: number; // 0..1
  agent_reports: CanonConsumptionReport[];
  aggregated_usage_mode: CanonUsageMode;
  timestamp: string;
}

/**
 * Extract canon consumption from an agent's WorkResult.
 * Agents report usage via result.metrics with canon_* keys.
 * If no explicit report, consumption is "ignored" (packets available but not acknowledged).
 */
export function extractCanonConsumption(
  agentId: string,
  stage: string,
  availablePacketIds: string[],
  agentMetrics?: Record<string, number>,
  agentLogs?: string[],
): CanonConsumptionReport {
  const available = availablePacketIds.length > 0;

  if (!available) {
    return {
      canon_context_available: false,
      canon_packet_ids_available: [],
      canon_packet_ids_used: [],
      canon_categories_used: [],
      canon_usage_mode: "none",
      canon_usage_explanation: "No canon packets were available for this execution",
      agent_id: agentId,
      stage,
    };
  }

  // Agents signal usage via metrics: canon_packets_used = N, canon_usage_mode = 1/2/3
  // and via logs containing "[canon:used:<id>]" markers
  const usedIds: string[] = [];
  const categoriesUsed: string[] = [];
  let usageMode: CanonUsageMode = "ignored";
  let explanation = "Canon packets were available but agent did not report usage";

  // Check metrics for explicit canon consumption signal
  if (agentMetrics) {
    const reportedMode = agentMetrics["canon_usage_mode"];
    if (reportedMode === 1) usageMode = "referenced";
    else if (reportedMode === 2) usageMode = "applied";
    else if (reportedMode === 3) usageMode = "rejected";

    const packetsUsed = agentMetrics["canon_packets_used"] || 0;
    if (packetsUsed > 0 && usageMode === "ignored") {
      usageMode = "referenced";
    }
  }

  // Parse logs for canon usage markers: [canon:used:<entry_id>] or [canon:applied:<entry_id>]
  if (agentLogs) {
    for (const log of agentLogs) {
      const usedMatch = log.match(/\[canon:(used|applied|referenced):([^\]]+)\]/g);
      if (usedMatch) {
        for (const m of usedMatch) {
          const parts = m.replace("[", "").replace("]", "").split(":");
          if (parts[2] && availablePacketIds.includes(parts[2])) {
            usedIds.push(parts[2]);
            if (parts[1] === "applied" && usageMode !== "applied") usageMode = "applied";
            else if (parts[1] === "referenced" && usageMode === "ignored") usageMode = "referenced";
          }
        }
      }
      // Check for category markers: [canon:category:<cat>]
      const catMatch = log.match(/\[canon:category:([^\]]+)\]/g);
      if (catMatch) {
        for (const cm of catMatch) {
          const cat = cm.replace("[canon:category:", "").replace("]", "");
          if (cat && !categoriesUsed.includes(cat)) categoriesUsed.push(cat);
        }
      }
    }
  }

  // If agent used packets, update explanation
  if (usedIds.length > 0) {
    explanation = `Agent ${usageMode} ${usedIds.length} of ${availablePacketIds.length} canon packets`;
  } else if (usageMode === "rejected") {
    explanation = "Agent explicitly rejected available canon packets";
  } else if (usageMode === "referenced") {
    explanation = "Agent referenced canon context without specifying packet IDs";
  }

  return {
    canon_context_available: true,
    canon_packet_ids_available: availablePacketIds,
    canon_packet_ids_used: [...new Set(usedIds)],
    canon_categories_used: categoriesUsed,
    canon_usage_mode: usageMode,
    canon_usage_explanation: explanation,
    agent_id: agentId,
    stage,
  };
}

/**
 * Build an aggregated consumption trace for a full stage execution.
 */
export function buildCanonConsumptionTrace(
  runId: string,
  stage: string,
  reports: CanonConsumptionReport[],
  availablePacketIds: string[],
): CanonConsumptionTrace {
  const allUsedIds = [...new Set(reports.flatMap((r) => r.canon_packet_ids_used))];
  const ignoredCount = availablePacketIds.length - allUsedIds.length;
  const usageRate = availablePacketIds.length > 0
    ? allUsedIds.length / availablePacketIds.length
    : 0;

  // Aggregate usage mode across agents
  let aggregated: CanonUsageMode = "none";
  if (availablePacketIds.length === 0) {
    aggregated = "none";
  } else if (reports.some((r) => r.canon_usage_mode === "applied")) {
    aggregated = "applied";
  } else if (reports.some((r) => r.canon_usage_mode === "referenced")) {
    aggregated = "referenced";
  } else if (reports.some((r) => r.canon_usage_mode === "rejected")) {
    aggregated = "rejected";
  } else {
    aggregated = "ignored";
  }

  return {
    stage,
    run_id: runId,
    total_packets_available: availablePacketIds.length,
    total_packets_used: allUsedIds.length,
    total_packets_ignored: Math.max(0, ignoredCount),
    usage_rate: Math.round(usageRate * 100) / 100,
    agent_reports: reports,
    aggregated_usage_mode: aggregated,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format canon knowledge packets for agent-friendly injection.
 * Returns a structured, clearly labeled block that agents can parse.
 */
export function formatCanonForAgentContext(
  packets: CanonKnowledgePacket[],
): Record<string, unknown> {
  if (!packets || packets.length === 0) {
    return {
      canon_available: false,
      canon_instruction: "No canon knowledge available for this execution.",
      packets: [],
    };
  }

  return {
    canon_available: true,
    canon_instruction:
      "The following canon knowledge packets are available for your task. " +
      "If you use any packet, signal it in your logs with [canon:used:<canon_entry_id>] " +
      "or [canon:applied:<canon_entry_id>]. If you reject a packet, note why.",
    canon_packet_count: packets.length,
    packets: packets.map((p) => ({
      id: p.canon_entry_id,
      title: p.title,
      category: p.category,
      practice_type: p.practice_type,
      summary: p.summary,
      guidance: p.guidance,
      confidence: p.confidence,
      suggested_use: p.suggested_use,
      source: p.source_reference,
      is_anti_pattern: p.anti_pattern_flag,
      stack: p.stack_scope,
    })),
  };
}

// ── Helpers ──

function stageToAgentType(stage: StageName): string {
  const map: Record<string, string> = {
    intake: "perception",
    perception: "perception",
    design: "architecture",
    build: "build",
    validation: "validation",
    evolution: "evolution",
    done: "evolution",
  };
  return map[stage] || "build";
}
