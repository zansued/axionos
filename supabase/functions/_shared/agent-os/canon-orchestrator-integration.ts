/**
 * Canon–Orchestrator Integration — Sprint 122
 *
 * Connects the Canon / Pattern Library to the AgentOS Orchestrator.
 * Before agent dispatch, retrieves relevant canon knowledge based on
 * stage, initiative context, stack, and problem type, then injects
 * it into the execution context.
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

// ── Canon Retrieval Result ──

export interface CanonRetrievalRequest {
  stage: string;
  query: RetrievalQuery;
  filters: ReturnType<typeof buildRetrievalFilters>;
  canon_context: CanonContext;
  timestamp: string;
}

export interface CanonRetrievalResult {
  success: boolean;
  entries_retrieved: number;
  pattern_ids: string[];
  categories_used: string[];
  confidence_scores: number[];
  knowledge_context: Record<string, unknown>;
  retrieval_request: CanonRetrievalRequest;
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
    timestamp: new Date().toISOString(),
  };
}

/**
 * Simulate canon retrieval (will be replaced by real DB query in AE sprints).
 * Returns available canon knowledge for the given request.
 *
 * IMPORTANT: This is a safe-fallback implementation. If retrieval fails,
 * it returns an empty result so execution can continue.
 */
export async function retrieveCanonKnowledge(
  request: CanonRetrievalRequest,
): Promise<CanonRetrievalResult> {
  try {
    // In production, this would query the canon_entries and pattern_library tables
    // using the filters and canon_context from the request.
    // For now, return a structured empty result that signals "no canon available yet"
    // but preserves the full retrieval request for traceability.

    return {
      success: true,
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
      retrieval_request: request,
    };
  } catch (error) {
    return {
      success: false,
      entries_retrieved: 0,
      pattern_ids: [],
      categories_used: [],
      confidence_scores: [],
      knowledge_context: {},
      retrieval_request: request,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Inject canon knowledge into the WorkInput context.
 * Returns a new WorkInput with canon context merged.
 */
export function injectCanonIntoWorkInput(
  input: WorkInput,
  result: CanonRetrievalResult,
): WorkInput {
  return {
    ...input,
    context: {
      ...input.context,
      canon_knowledge: result.knowledge_context,
      canon_entries_count: result.entries_retrieved,
      canon_pattern_ids: result.pattern_ids,
      canon_retrieval_success: result.success,
      canon_categories_used: result.categories_used,
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
    timestamp: new Date().toISOString(),
    error: result.error,
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
