/**
 * AgentOS Canon Provider — Sprint 143
 * Provides operational knowledge retrieval for AgentOS agents.
 * Agents call this during code generation, repair, validation, and planning.
 */

import type { AgentCanonQuery, AgentCanonResponse, PatternLibraryEntry } from "./canon-types";
import { canonEntryToPatternLibraryEntry, isCanonEntryPromotableToLibrary } from "./canon-pipeline";

/**
 * Build AgentOS-compatible canon retrieval request body
 * for use with supabase.functions.invoke("canon-retrieval", ...)
 */
export function buildAgentCanonRequest(query: AgentCanonQuery): Record<string, unknown> {
  return {
    action: "retrieve_patterns",
    organization_id: "", // Caller must set this
    task_type: query.taskType,
    stack: query.stack,
    language: query.language,
    problem_type: query.problemType,
    max_results: query.maxPatterns || 5,
    min_confidence: 0.4,
    include_experimental: false,
    // Metadata for traceability
    _agent_type: query.agentType,
    _pipeline_stage: query.pipelineStage,
  };
}

/**
 * Parse canon retrieval response into AgentOS-compatible format
 */
export function parseAgentCanonResponse(data: any): AgentCanonResponse {
  const patterns: PatternLibraryEntry[] = (data?.patterns || []).map((p: any) => ({
    canonEntryId: p.canonEntryId || p.id,
    title: p.title,
    summary: p.summary,
    category: p.canonType || "pattern",
    stack: p.stackTags || [],
    language: p.languageTags || [],
    framework: p.frameworkTags || [],
    problemType: p.problemType || "general",
    confidenceScore: p.confidenceScore || 0,
    approvalStatus: p.approvalStatus || "approved",
    lifecycleStatus: p.lifecycleStatus || "active",
    implementationGuidance: p.implementationGuidance || "",
    body: p.body || "",
  }));

  const antiPatterns = patterns
    .filter(p => p.category === "anti_pattern")
    .map(p => p.summary);

  const conventions = patterns
    .filter(p => ["convention", "rule", "best_practice"].includes(p.category))
    .map(p => `${p.title}: ${p.summary}`);

  return {
    patterns: patterns.filter(p => p.category !== "anti_pattern"),
    conventions,
    antiPatterns,
    totalAvailable: data?.totalAvailable || patterns.length,
    retrievedAt: new Date().toISOString(),
  };
}

/**
 * Format patterns as context injection text for LLM prompts.
 * Used by AgentOS when injecting canon knowledge into agent task context.
 */
export function formatCanonContextForAgent(response: AgentCanonResponse): string {
  const sections: string[] = [];

  if (response.patterns.length > 0) {
    sections.push("## Available Implementation Patterns");
    response.patterns.forEach((p, i) => {
      sections.push(`### ${i + 1}. ${p.title} (confidence: ${(p.confidenceScore * 100).toFixed(0)}%)`);
      sections.push(p.summary);
      if (p.implementationGuidance) sections.push(`**Guidance:** ${p.implementationGuidance}`);
      sections.push("");
    });
  }

  if (response.conventions.length > 0) {
    sections.push("## Conventions & Best Practices");
    response.conventions.forEach(c => sections.push(`- ${c}`));
    sections.push("");
  }

  if (response.antiPatterns.length > 0) {
    sections.push("## Anti-Patterns to Avoid");
    response.antiPatterns.forEach(a => sections.push(`- ⚠️ ${a}`));
    sections.push("");
  }

  return sections.join("\n");
}
