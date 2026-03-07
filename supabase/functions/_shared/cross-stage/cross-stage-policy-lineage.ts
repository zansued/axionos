// Cross-Stage Policy Lineage — AxionOS Sprint 26
// Preserves provenance and auditability for cross-stage policies.

export interface PolicyLineage {
  policy_id: string;
  source_edges: string[];
  source_learning_signals: any[];
  source_stage_metrics: any[];
  predictive_inputs: any[];
  memory_refs: any[];
  repair_evidence: any[];
  status_history: StatusChange[];
}

export interface StatusChange {
  from_status: string;
  to_status: string;
  reason: string;
  timestamp: string;
}

/**
 * Build lineage record from synthesis inputs.
 */
export function buildLineage(
  policyId: string,
  edgeIds: string[],
  learningSignals: any[],
  stageMetrics: any[],
  predictiveInputs: any[],
  memoryRefs: any[],
  repairEvidence: any[],
): PolicyLineage {
  return {
    policy_id: policyId,
    source_edges: edgeIds,
    source_learning_signals: learningSignals,
    source_stage_metrics: stageMetrics,
    predictive_inputs: predictiveInputs,
    memory_refs: memoryRefs,
    repair_evidence: repairEvidence,
    status_history: [],
  };
}

/**
 * Record a status change in lineage.
 */
export function addStatusChange(
  lineage: PolicyLineage,
  fromStatus: string,
  toStatus: string,
  reason: string,
): PolicyLineage {
  return {
    ...lineage,
    status_history: [
      ...lineage.status_history,
      {
        from_status: fromStatus,
        to_status: toStatus,
        reason,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Explain why a policy exists based on lineage.
 */
export function explainPolicy(lineage: PolicyLineage): {
  stages_linked: string[];
  evidence_count: number;
  sources: string[];
  status_transitions: number;
  explanation: string;
} {
  const sources: string[] = [];
  if (lineage.source_edges.length > 0) sources.push(`${lineage.source_edges.length} cross-stage edges`);
  if (lineage.source_learning_signals.length > 0) sources.push(`${lineage.source_learning_signals.length} learning signals`);
  if (lineage.repair_evidence.length > 0) sources.push(`${lineage.repair_evidence.length} repair evidence items`);
  if (lineage.memory_refs.length > 0) sources.push(`${lineage.memory_refs.length} memory references`);
  if (lineage.predictive_inputs.length > 0) sources.push(`${lineage.predictive_inputs.length} predictive inputs`);

  const evidenceCount =
    lineage.source_edges.length +
    lineage.source_learning_signals.length +
    lineage.repair_evidence.length +
    lineage.memory_refs.length +
    lineage.predictive_inputs.length;

  return {
    stages_linked: lineage.source_edges,
    evidence_count: evidenceCount,
    sources,
    status_transitions: lineage.status_history.length,
    explanation: `Policy synthesized from ${sources.join(", ")}. ${lineage.status_history.length} status transitions recorded.`,
  };
}

/**
 * Check if lineage supports rollback (has previous active state).
 */
export function canRollback(lineage: PolicyLineage): boolean {
  return lineage.status_history.some(
    s => s.from_status === "active" && (s.to_status === "watch" || s.to_status === "deprecated"),
  );
}
