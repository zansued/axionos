/**
 * Alignment vs Erosion Engine — Sprint 109
 * Separates healthy adaptation from mission-eroding drift.
 */

export interface AlignmentInput {
  alignment_score: number;   // 0-1
  drift_risk_score: number;  // 0-1
  erosion_score: number;     // 0-1
  adaptation_score: number;  // 0-1
}

export type AlignmentPosture =
  | "mission_aligned"
  | "healthy_adaptation"
  | "mild_drift"
  | "significant_drift"
  | "active_erosion"
  | "normative_compromise";

export interface AlignmentVerdict {
  posture: AlignmentPosture;
  is_healthy: boolean;
  requires_correction: boolean;
  explanation: string;
}

export function evaluateAlignmentPosture(input: AlignmentInput): AlignmentVerdict {
  const { alignment_score, drift_risk_score, erosion_score, adaptation_score } = input;

  if (erosion_score >= 0.7) {
    return {
      posture: "normative_compromise",
      is_healthy: false,
      requires_correction: true,
      explanation: "Mission principles are being actively compromised. Erosion score indicates normative damage beyond acceptable threshold.",
    };
  }

  if (erosion_score >= 0.4 && drift_risk_score >= 0.5) {
    return {
      posture: "active_erosion",
      is_healthy: false,
      requires_correction: true,
      explanation: "Combined erosion and drift signals indicate the institution is moving away from its mission while accumulating structural damage.",
    };
  }

  if (drift_risk_score >= 0.5 && alignment_score < 0.5) {
    return {
      posture: "significant_drift",
      is_healthy: false,
      requires_correction: true,
      explanation: "Drift risk is elevated and alignment is below threshold. Operational activity may be diverging from mission direction.",
    };
  }

  if (drift_risk_score >= 0.3 || (erosion_score >= 0.2 && alignment_score < 0.7)) {
    return {
      posture: "mild_drift",
      is_healthy: false,
      requires_correction: false,
      explanation: "Early drift signals detected. Not yet critical, but warrants monitoring and potential course correction.",
    };
  }

  if (adaptation_score >= 0.5 && alignment_score >= 0.6) {
    return {
      posture: "healthy_adaptation",
      is_healthy: true,
      requires_correction: false,
      explanation: "The subject is adapting to context while remaining aligned with mission principles. Adaptation is constructive.",
    };
  }

  return {
    posture: "mission_aligned",
    is_healthy: true,
    requires_correction: false,
    explanation: "Subject is well-aligned with mission. No drift or erosion signals detected.",
  };
}

export function computeAlignmentScores(subjectSummary: string, missionStatement: string): AlignmentInput {
  // Deterministic scoring based on content analysis heuristics
  const sLen = subjectSummary.length;
  const mLen = missionStatement.length;
  const overlap = Math.min(sLen, mLen) / Math.max(sLen, mLen, 1);

  const alignment = Math.min(1, 0.5 + overlap * 0.4 + (sLen > 20 ? 0.1 : 0));
  const drift = Math.max(0, 0.3 - overlap * 0.3 + (sLen < 10 ? 0.2 : 0));
  const erosion = Math.max(0, drift * 0.6);
  const adaptation = Math.min(1, 0.4 + overlap * 0.3);

  return {
    alignment_score: round(alignment),
    drift_risk_score: round(drift),
    erosion_score: round(erosion),
    adaptation_score: round(adaptation),
  };
}

function round(v: number): number {
  return Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;
}
