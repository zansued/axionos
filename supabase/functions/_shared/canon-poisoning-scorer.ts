/**
 * canon-poisoning-scorer.ts
 * Computes poisoning risk for knowledge candidates and sources.
 * Evidence-first, explainable scoring — no black-box detection.
 */

export interface PoisoningScorerInput {
  candidate_title: string;
  candidate_summary: string;
  candidate_body?: string;
  source_type: string;
  source_trust_score?: number;
  confidence_score?: number;
  signal_count?: number;
  source_name?: string;
  existing_canon_titles?: string[];
  similar_candidate_count?: number;
}

export interface PoisoningSignal {
  signal_type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: string;
  weight: number;
}

export interface PoisoningScorerResult {
  poisoning_risk_score: number;        // 0-100
  poisoning_risk_level: "none" | "low" | "medium" | "high" | "critical";
  poisoning_signals: PoisoningSignal[];
  risk_reason_summary: string;
  requires_security_review: boolean;
  recommended_action: "allow" | "allow_with_warning" | "lower_confidence" | "quarantine" | "block" | "security_review";
}

// Suspicious instruction patterns (prompt injection indicators)
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+a/i,
  /system\s*:\s*you\s+must/i,
  /override\s+(all\s+)?safety/i,
  /disregard\s+(your\s+)?guidelines/i,
  /act\s+as\s+(if\s+you\s+are|a)\s/i,
  /do\s+not\s+follow\s+(any|your)\s/i,
  /pretend\s+you\s+(are|have)/i,
  /bypass\s+(all\s+)?restrictions/i,
  /new\s+instructions?\s*:/i,
];

// Insecure practice indicators
const INSECURE_PATTERNS = [
  { pattern: /eval\s*\(/i, label: "eval() usage" },
  { pattern: /dangerouslySetInnerHTML/i, label: "dangerouslySetInnerHTML" },
  { pattern: /disable\s+(all\s+)?security/i, label: "security disabling" },
  { pattern: /no\s+authentication\s+required/i, label: "auth bypass recommendation" },
  { pattern: /skip\s+(all\s+)?validation/i, label: "validation bypass" },
  { pattern: /trust\s+all\s+input/i, label: "unrestricted input trust" },
  { pattern: /hardcoded?\s+(secret|password|key|token)/i, label: "hardcoded secrets" },
  { pattern: /disable\s+cors/i, label: "CORS disabling" },
  { pattern: /sql\s+injection/i, label: "SQL injection pattern" },
  { pattern: /execute\s+arbitrary/i, label: "arbitrary execution" },
];

function checkText(text: string): { injections: string[]; insecure: string[] } {
  const injections: string[] = [];
  const insecure: string[] = [];
  for (const rx of INJECTION_PATTERNS) {
    if (rx.test(text)) injections.push(rx.source);
  }
  for (const { pattern, label } of INSECURE_PATTERNS) {
    if (pattern.test(text)) insecure.push(label);
  }
  return { injections, insecure };
}

export function scorePoisoningRisk(input: PoisoningScorerInput): PoisoningScorerResult {
  const signals: PoisoningSignal[] = [];
  const fullText = `${input.candidate_title} ${input.candidate_summary} ${input.candidate_body || ""}`;

  // 1. Instruction injection detection
  const { injections, insecure } = checkText(fullText);
  for (const inj of injections) {
    signals.push({
      signal_type: "instruction_injection_detected",
      severity: "critical",
      description: "Content contains prompt/instruction injection patterns",
      evidence: `Matched: ${inj}`,
      weight: 30,
    });
  }

  // 2. Insecure practice detection
  for (const label of insecure) {
    signals.push({
      signal_type: "unsafe_pattern_candidate",
      severity: "high",
      description: `Content promotes insecure practice: ${label}`,
      evidence: label,
      weight: 20,
    });
  }

  // 3. Confidence laundering: high confidence from low-trust source
  const trust = input.source_trust_score ?? 50;
  const confidence = input.confidence_score ?? 50;
  if (trust < 30 && confidence > 70) {
    signals.push({
      signal_type: "confidence_laundering_risk",
      severity: "high",
      description: "High confidence from a low-trust source",
      evidence: `Source trust: ${trust}, Candidate confidence: ${confidence}`,
      weight: 25,
    });
  }

  // 4. Weak provenance + high confidence
  if (input.signal_count !== undefined && input.signal_count <= 1 && confidence > 75) {
    signals.push({
      signal_type: "weak_provenance_high_confidence",
      severity: "medium",
      description: "High confidence with minimal supporting evidence",
      evidence: `Signal count: ${input.signal_count}, confidence: ${confidence}`,
      weight: 15,
    });
  }

  // 5. Repetition gaming: many similar candidates from weak sources
  if ((input.similar_candidate_count ?? 0) > 5 && trust < 40) {
    signals.push({
      signal_type: "poisoning_recurrence_detected",
      severity: "high",
      description: "Multiple similar candidates from low-trust source suggests repetition gaming",
      evidence: `${input.similar_candidate_count} similar candidates, trust: ${trust}`,
      weight: 20,
    });
  }

  // 6. Canon conflict detection
  const titleLower = input.candidate_title.toLowerCase();
  const conflicting = (input.existing_canon_titles || []).filter(t => {
    const existing = t.toLowerCase();
    // Check for contradictory patterns (anti- prefix, negation)
    return (existing.includes(titleLower) || titleLower.includes(existing)) &&
      (titleLower.startsWith("anti-") !== existing.startsWith("anti-"));
  });
  if (conflicting.length > 0) {
    signals.push({
      signal_type: "canon_conflict_detected",
      severity: "medium",
      description: "Candidate conflicts with existing established canon",
      evidence: `Conflicts with: ${conflicting.join(", ")}`,
      weight: 15,
    });
  }

  // 7. Suspicious source pattern
  if (input.source_type === "deep_repo_absorber" && trust < 20) {
    signals.push({
      signal_type: "suspicious_source_pattern",
      severity: "medium",
      description: "Externally absorbed content from very low-trust source",
      evidence: `Source type: ${input.source_type}, trust: ${trust}`,
      weight: 15,
    });
  }

  // Compute composite score
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const riskScore = Math.min(100, totalWeight);

  const riskLevel = riskScore >= 70 ? "critical"
    : riskScore >= 50 ? "high"
    : riskScore >= 30 ? "medium"
    : riskScore >= 10 ? "low"
    : "none";

  const requiresReview = riskScore >= 30;

  const recommendedAction = riskScore >= 70 ? "quarantine"
    : riskScore >= 50 ? "security_review"
    : riskScore >= 30 ? "lower_confidence"
    : riskScore >= 10 ? "allow_with_warning"
    : "allow";

  const reasons = signals.map(s => s.description);
  const riskSummary = reasons.length > 0
    ? `${reasons.length} risk signal(s) detected: ${reasons.join("; ")}`
    : "No poisoning risk signals detected.";

  return {
    poisoning_risk_score: riskScore,
    poisoning_risk_level: riskLevel,
    poisoning_signals: signals,
    risk_reason_summary: riskSummary,
    requires_security_review: requiresReview,
    recommended_action: recommendedAction,
  };
}

// Trust floor constants for promotion gates
export const PROMOTION_TRUST_FLOOR = 25;
export const PROMOTION_MAX_RISK_SCORE = 40;
export const FIRST_TIME_SOURCE_TRUST_FLOOR = 40;
