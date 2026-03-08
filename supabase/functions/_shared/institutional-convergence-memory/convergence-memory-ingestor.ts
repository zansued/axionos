/**
 * Convergence Memory Ingestor
 * Converts approved governance cases and realized outcomes into durable memory entries.
 * Advisory-first: stores knowledge, never mutates architecture.
 */

export interface IngestionInput {
  organizationId: string;
  workspaceId?: string;
  sourceCaseId?: string;
  sourceDecisionId?: string;
  sourceOutcomeId?: string;
  convergenceDomain: string;
  title: string;
  summary: string;
  actionType: string;
  specializationType: string;
  rationale: string;
  assumptions: Record<string, unknown>;
  expectedOutcomes: Record<string, unknown>;
  realizedOutcomes: Record<string, unknown>;
  evidenceBundles?: Array<{
    evidenceType: string;
    evidencePayload: Record<string, unknown>;
    sourceRef: Record<string, unknown>;
    confidenceScore: number;
  }>;
}

export function classifyMemoryType(actionType: string, realizedOutcomes: Record<string, unknown>): string {
  const wasSuccessful = (realizedOutcomes as any)?.success === true || (realizedOutcomes as any)?.status === 'helpful';
  const wasFailed = (realizedOutcomes as any)?.success === false || (realizedOutcomes as any)?.status === 'harmful';

  if (actionType === 'promote_shared') return wasSuccessful ? 'promotion_success' : 'promotion_failure';
  if (actionType === 'retain_local') return 'retention_justified';
  if (actionType === 'deprecate' || actionType === 'retire') return 'deprecation_outcome';
  if (actionType === 'bounded_merge') return 'merge_outcome';
  if (wasFailed) return 'anti_pattern';
  return 'convergence_outcome';
}

export function computeContextSignature(input: IngestionInput): string {
  const parts = [
    input.convergenceDomain,
    input.actionType,
    input.specializationType,
    Object.keys(input.assumptions).sort().join(','),
  ];
  return parts.filter(Boolean).join('::');
}

export function computeEvidenceDensity(evidenceBundles?: IngestionInput['evidenceBundles']): number {
  if (!evidenceBundles || evidenceBundles.length === 0) return 0;
  const avgConfidence = evidenceBundles.reduce((s, e) => s + e.confidenceScore, 0) / evidenceBundles.length;
  const countFactor = Math.min(evidenceBundles.length / 5, 1);
  return Math.round(((avgConfidence * 0.6) + (countFactor * 0.4)) * 100) / 100;
}

export function computeInitialQuality(evidenceDensity: number, hasRealizedOutcomes: boolean): number {
  let quality = evidenceDensity * 0.5;
  if (hasRealizedOutcomes) quality += 0.3;
  quality += 0.2; // baseline for having been ingested from a governed case
  return Math.round(Math.min(quality, 1) * 100) / 100;
}

export function buildMemoryEntry(input: IngestionInput) {
  const memoryType = classifyMemoryType(input.actionType, input.realizedOutcomes);
  const contextSignature = computeContextSignature(input);
  const evidenceDensity = computeEvidenceDensity(input.evidenceBundles);
  const hasRealized = Object.keys(input.realizedOutcomes).length > 0;
  const quality = computeInitialQuality(evidenceDensity, hasRealized);

  return {
    entry: {
      organization_id: input.organizationId,
      workspace_id: input.workspaceId || null,
      memory_type: memoryType,
      convergence_domain: input.convergenceDomain,
      source_case_id: input.sourceCaseId || null,
      source_decision_id: input.sourceDecisionId || null,
      source_outcome_id: input.sourceOutcomeId || null,
      title: input.title,
      summary: input.summary,
      context_signature: contextSignature,
      specialization_type: input.specializationType,
      action_type: input.actionType,
      rationale: input.rationale,
      assumptions: input.assumptions,
      expected_outcomes: input.expectedOutcomes,
      realized_outcomes: input.realizedOutcomes,
      evidence_density_score: evidenceDensity,
      reuse_confidence_score: quality * 0.8,
      memory_quality_score: quality,
      regression_risk_score: memoryType === 'anti_pattern' ? 0.7 : 0.1,
      tags: [],
    },
    evidenceRecords: (input.evidenceBundles || []).map(e => ({
      organization_id: input.organizationId,
      evidence_type: e.evidenceType,
      evidence_payload: e.evidencePayload,
      source_ref: e.sourceRef,
      confidence_score: e.confidenceScore,
    })),
  };
}
