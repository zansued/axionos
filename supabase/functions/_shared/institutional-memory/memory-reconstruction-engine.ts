/**
 * Memory Reconstruction Engine — Sprint 103
 * Builds reconstruction paths using source references and fallback artifacts.
 */

export interface ReconstructionSource {
  source_type: string;
  source_id: string;
  availability: "available" | "partial" | "unavailable";
  confidence: number;
}

export interface ReconstructionPath {
  reconstruction_type: string;
  sources: ReconstructionSource[];
  recovery_sequence: string[];
  confidence_score: number;
  feasibility: "high" | "medium" | "low" | "impossible";
}

export function buildReconstructionPath(
  sourceType: string,
  sourceRef: string,
  domain: string,
  memoryPayload: Record<string, unknown>
): ReconstructionPath {
  const sources: ReconstructionSource[] = [];
  const sequence: string[] = [];

  // Primary source
  if (sourceRef) {
    sources.push({
      source_type: sourceType,
      source_id: sourceRef,
      availability: "available",
      confidence: 0.9,
    });
    sequence.push(`1. Retrieve primary source: ${sourceType}/${sourceRef}`);
  }

  // Embedded references as secondary sources
  const refFields = ["doctrine_id", "decision_id", "conflict_id", "assessment_id"];
  for (const field of refFields) {
    if (memoryPayload[field]) {
      sources.push({
        source_type: field.replace("_id", ""),
        source_id: String(memoryPayload[field]),
        availability: "available",
        confidence: 0.7,
      });
      sequence.push(`${sequence.length + 1}. Cross-reference ${field.replace("_id", "")} record`);
    }
  }

  // Domain-level fallback
  if (domain) {
    sources.push({
      source_type: "domain_archive",
      source_id: domain,
      availability: "partial",
      confidence: 0.4,
    });
    sequence.push(`${sequence.length + 1}. Search domain archive: ${domain}`);
  }

  sequence.push(`${sequence.length + 1}. Validate reconstructed memory against constitutional principles`);

  const avgConfidence = sources.length > 0
    ? sources.reduce((s, src) => s + src.confidence, 0) / sources.length
    : 0;

  const feasibility: ReconstructionPath["feasibility"] =
    avgConfidence >= 0.7 ? "high" :
    avgConfidence >= 0.5 ? "medium" :
    avgConfidence >= 0.2 ? "low" : "impossible";

  return {
    reconstruction_type: sourceType ? `from_${sourceType}` : "domain_search",
    sources,
    recovery_sequence: sequence,
    confidence_score: Math.round(avgConfidence * 1000) / 1000,
    feasibility,
  };
}
