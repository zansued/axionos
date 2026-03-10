/**
 * Moat Domain Detector — Sprint 122
 * Identifies domains where compounding scores indicate durable capability moat.
 */

export interface MoatCandidate {
  domain_name: string;
  compounding_score: number;
  uniqueness_score: number;
  reuse_density: number;
  failure_resilience: number;
}

export interface MoatDetectionResult {
  is_moat: boolean;
  moat_status: "confirmed" | "emerging" | "candidate" | "weak";
  confidence: number;
  reasoning: string;
  recommended_productization: string;
}

const MOAT_THRESHOLD = 0.7;
const EMERGING_THRESHOLD = 0.5;

export function detectMoat(candidate: MoatCandidate): MoatDetectionResult {
  const avg = (candidate.compounding_score + candidate.uniqueness_score + candidate.reuse_density + candidate.failure_resilience) / 4;

  if (avg >= MOAT_THRESHOLD && candidate.uniqueness_score >= 0.6) {
    return {
      is_moat: true,
      moat_status: "confirmed",
      confidence: Math.min(1, avg),
      reasoning: `Domain '${candidate.domain_name}' shows strong compounding (${(avg * 100).toFixed(0)}%) with high uniqueness. This is a durable capability moat.`,
      recommended_productization: "Package as reusable doctrine asset for cross-tenant leverage.",
    };
  }

  if (avg >= EMERGING_THRESHOLD) {
    return {
      is_moat: false,
      moat_status: "emerging",
      confidence: avg,
      reasoning: `Domain '${candidate.domain_name}' shows emerging advantage (${(avg * 100).toFixed(0)}%). Continue investing to reach moat threshold.`,
      recommended_productization: "Monitor and strengthen through targeted execution.",
    };
  }

  if (avg >= 0.3) {
    return {
      is_moat: false,
      moat_status: "candidate",
      confidence: avg,
      reasoning: `Domain '${candidate.domain_name}' is a candidate (${(avg * 100).toFixed(0)}%). Needs more evidence and reuse to compound.`,
      recommended_productization: "No productization yet — build more evidence.",
    };
  }

  return {
    is_moat: false,
    moat_status: "weak",
    confidence: avg,
    reasoning: `Domain '${candidate.domain_name}' shows weak compounding (${(avg * 100).toFixed(0)}%). May be a weak zone.`,
    recommended_productization: "Investigate whether this domain is worth continued investment.",
  };
}
