/**
 * Prediction Evidence Builder — Sprint 25
 * Assembles reason codes and evidence references for predictions.
 * SAFETY: Read-only evidence assembly. No mutations.
 */

import type { PredictiveEvidence } from "./predictive-risk-engine.ts";

export interface EvidenceSource {
  type: "error_pattern" | "repair_evidence" | "prevention_rule" | "memory_signal" | "strategy_regression" | "model_degradation";
  ref_id: string;
  relevance: number;
  summary: string;
}

export function buildEvidenceRefs(sources: EvidenceSource[]): PredictiveEvidence[] {
  return sources
    .filter((s) => s.relevance > 0.1)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 20)
    .map((s) => ({
      source: s.type,
      ref_id: s.ref_id,
      relevance: s.relevance,
      detail: s.summary,
    }));
}

export function buildExplanationCodes(evidence: PredictiveEvidence[], retryCount: number, riskScore: number): string[] {
  const codes: string[] = [];
  
  const bySource = new Map<string, number>();
  for (const e of evidence) {
    bySource.set(e.source, (bySource.get(e.source) || 0) + 1);
  }
  
  for (const [source, count] of bySource) {
    codes.push(`evidence:${source}:${count}`);
  }
  
  if (retryCount > 0) codes.push(`retry_count:${retryCount}`);
  if (riskScore >= 0.8) codes.push("risk_level:critical");
  else if (riskScore >= 0.6) codes.push("risk_level:high");
  else if (riskScore >= 0.35) codes.push("risk_level:moderate");
  
  return codes;
}

export function deduplicateEvidence(evidence: PredictiveEvidence[]): PredictiveEvidence[] {
  const seen = new Set<string>();
  return evidence.filter((e) => {
    const key = `${e.source}:${e.ref_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
