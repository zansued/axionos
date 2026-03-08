/**
 * Local Specialization Preservation Analyzer
 * Identifies patterns showing when local variants should remain local.
 */

export interface PreservationSignal {
  entryId: string;
  convergenceDomain: string;
  specializationType: string;
  preservationStrength: number;
  rationale: string;
  evidenceCount: number;
}

export interface MemoryEntryForPreservation {
  id: string;
  memory_type: string;
  convergence_domain: string;
  specialization_type: string;
  action_type: string;
  rationale: string;
  realized_outcomes: Record<string, unknown>;
  evidence_density_score: number;
  memory_quality_score: number;
}

export function analyzePreservationSignals(entries: MemoryEntryForPreservation[]): PreservationSignal[] {
  const preservationEntries = entries.filter(e =>
    e.memory_type === 'retention_justified' ||
    e.action_type === 'retain_local' ||
    (e.memory_type === 'promotion_failure' && isRegressionOutcome(e.realized_outcomes))
  );

  return preservationEntries.map(entry => {
    const strength = computePreservationStrength(entry);
    return {
      entryId: entry.id,
      convergenceDomain: entry.convergence_domain,
      specializationType: entry.specialization_type,
      preservationStrength: strength,
      rationale: entry.rationale || 'Local specialization preserved based on historical evidence',
      evidenceCount: Math.round(entry.evidence_density_score * 5),
    };
  }).sort((a, b) => b.preservationStrength - a.preservationStrength);
}

function computePreservationStrength(entry: MemoryEntryForPreservation): number {
  let strength = entry.memory_quality_score * 0.4;
  strength += entry.evidence_density_score * 0.3;

  if (entry.memory_type === 'promotion_failure') strength += 0.2;
  if (entry.memory_type === 'retention_justified') strength += 0.1;

  return Math.round(Math.min(strength, 1) * 100) / 100;
}

function isRegressionOutcome(outcomes: Record<string, unknown>): boolean {
  return (outcomes as any)?.regression === true ||
    (outcomes as any)?.status === 'harmful' ||
    (outcomes as any)?.caused_regression === true;
}

export function computeLocalPreservationScore(signals: PreservationSignal[]): number {
  if (signals.length === 0) return 0;
  const avgStrength = signals.reduce((s, sig) => s + sig.preservationStrength, 0) / signals.length;
  const coverageFactor = Math.min(signals.length / 10, 1);
  return Math.round((avgStrength * 0.7 + coverageFactor * 0.3) * 100) / 100;
}
