/**
 * Convergence Memory Explainer
 * Generates structured explanations for why a memory record was surfaced.
 */

export interface ExplainableMemory {
  id: string;
  title: string;
  memoryType: string;
  actionType: string;
  convergenceDomain: string;
  relevanceScore: number;
  qualityScore: number;
  evidenceDensity: number;
  reuseConfidence: number;
  contextSignature: string;
  rationale: string;
  assumptions: Record<string, unknown>;
  realizedOutcomes: Record<string, unknown>;
}

export interface MemoryExplanation {
  memoryId: string;
  title: string;
  surfacingReason: string;
  relevanceExplanation: string;
  qualityAssessment: string;
  confidenceBoundary: string;
  caveats: string[];
  recommendedUse: string;
}

export function explainMemorySurfacing(memory: ExplainableMemory, queryContext?: string): MemoryExplanation {
  const caveats: string[] = [];

  // Relevance explanation
  const relevanceExplanation = buildRelevanceExplanation(memory, queryContext);

  // Quality assessment
  let qualityAssessment: string;
  if (memory.qualityScore >= 0.7) qualityAssessment = 'High quality: strong evidence density and validated outcomes';
  else if (memory.qualityScore >= 0.4) qualityAssessment = 'Moderate quality: reasonable evidence but may benefit from additional validation';
  else {
    qualityAssessment = 'Low quality: limited evidence — use with caution';
    caveats.push('Low quality memory — cross-reference with other sources before relying on this');
  }

  // Confidence boundary
  let confidenceBoundary: string;
  if (memory.reuseConfidence >= 0.7) confidenceBoundary = 'High confidence — reuse is well-supported';
  else if (memory.reuseConfidence >= 0.4) confidenceBoundary = 'Moderate confidence — applicable but context-dependent';
  else {
    confidenceBoundary = 'Low confidence — treat as weak signal only';
    caveats.push('Low confidence — this memory may not generalize to current context');
  }

  // Evidence caveat
  if (memory.evidenceDensity < 0.3) {
    caveats.push('Limited evidence bundle — conclusions may be premature');
  }

  // Surfacing reason
  const surfacingReason = buildSurfacingReason(memory);

  // Recommended use
  const recommendedUse = buildRecommendedUse(memory);

  return {
    memoryId: memory.id,
    title: memory.title,
    surfacingReason,
    relevanceExplanation,
    qualityAssessment,
    confidenceBoundary,
    caveats,
    recommendedUse,
  };
}

function buildRelevanceExplanation(memory: ExplainableMemory, queryContext?: string): string {
  const parts: string[] = [];
  parts.push(`Domain: ${memory.convergenceDomain}`);
  parts.push(`Action: ${memory.actionType}`);
  parts.push(`Relevance score: ${memory.relevanceScore}`);
  if (queryContext) parts.push(`Query context overlap with: ${memory.contextSignature}`);
  return parts.join('. ');
}

function buildSurfacingReason(memory: ExplainableMemory): string {
  const typeReasons: Record<string, string> = {
    promotion_success: 'This promotion succeeded — relevant precedent for similar proposals',
    promotion_failure: 'This promotion failed — warning signal for similar proposals',
    retention_justified: 'This local specialization was preserved — evidence supports retention',
    deprecation_outcome: 'This deprecation outcome provides evidence for retirement decisions',
    merge_outcome: 'This bounded merge result informs future merge proposals',
    anti_pattern: 'This anti-pattern was detected — avoid repeating this convergence path',
    preservation_heuristic: 'This preservation heuristic was validated — local variant has proven value',
    convergence_outcome: 'This convergence outcome provides general evidence for future decisions',
  };
  return typeReasons[memory.memoryType] || 'Surfaced based on contextual relevance';
}

function buildRecommendedUse(memory: ExplainableMemory): string {
  if (memory.memoryType === 'anti_pattern') return 'Use as a negative signal when evaluating similar convergence proposals';
  if (memory.memoryType === 'retention_justified') return 'Use as evidence for preserving similar local specializations';
  if (memory.memoryType === 'promotion_success') return 'Use as supporting evidence for similar promotion proposals';
  if (memory.memoryType === 'promotion_failure') return 'Use as a caution signal — check if current conditions differ from failure conditions';
  return 'Use as contextual reference for convergence advisory';
}
