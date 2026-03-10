/**
 * Existential Drift Detector — Sprint 114
 * Detects when the system slowly violates its core operating principles.
 */

export const CORE_PRINCIPLES = [
  "advisory_first",
  "governance_before_autonomy",
  "rollback_everywhere",
  "bounded_adaptation",
  "human_approval_for_structural_change",
  "tenant_isolation",
  "no_autonomous_architecture_mutation",
] as const;

export type CorePrinciple = typeof CORE_PRINCIPLES[number];

export interface PrincipleViolation {
  principle: CorePrinciple;
  violation_description: string;
  evidence_count: number;
  severity: number; // 0-1
}

export interface ExistentialDriftInput {
  violations: PrincipleViolation[];
  autonomous_actions_without_review: number;
  governance_bypasses: number;
  identity_coherence_score: number; // 0-1, from external assessment
}

export interface ExistentialDriftResult {
  drift_score: number;
  severity: "none" | "emerging" | "active" | "existential";
  violated_principles: string[];
  rationale: string[];
  remediation_path: string;
}

export function detectExistentialDrift(input: ExistentialDriftInput): ExistentialDriftResult {
  const rationale: string[] = [];
  let drift = 0;

  // Principle violations
  const violatedPrinciples: string[] = [];
  for (const v of input.violations) {
    drift += v.severity * 0.15;
    violatedPrinciples.push(v.principle);
    rationale.push(`${v.principle}: ${v.violation_description} (${v.evidence_count} evidence)`);
  }

  // Autonomous actions without review
  if (input.autonomous_actions_without_review > 0) {
    drift += Math.min(0.2, input.autonomous_actions_without_review * 0.04);
    rationale.push(`${input.autonomous_actions_without_review} autonomous actions without review`);
  }

  // Governance bypasses
  if (input.governance_bypasses > 0) {
    drift += Math.min(0.25, input.governance_bypasses * 0.08);
    rationale.push(`${input.governance_bypasses} governance bypasses`);
  }

  // Identity coherence
  if (input.identity_coherence_score < 0.7) {
    drift += (1 - input.identity_coherence_score) * 0.2;
    rationale.push(`Low identity coherence: ${input.identity_coherence_score}`);
  }

  drift = Math.min(1, drift);

  let severity: ExistentialDriftResult["severity"] = "none";
  if (drift > 0.7) severity = "existential";
  else if (drift > 0.4) severity = "active";
  else if (drift > 0.15) severity = "emerging";

  let remediation_path = "No remediation needed";
  if (severity === "existential") remediation_path = "URGENT: Halt non-essential evolution. Conduct full kernel review. Restore violated principles.";
  else if (severity === "active") remediation_path = "Freeze new mutations. Review governance bypasses. Reinforce violated principles.";
  else if (severity === "emerging") remediation_path = "Monitor violated principles. Increase review frequency.";

  return {
    drift_score: Math.round(drift * 10000) / 10000,
    severity,
    violated_principles: violatedPrinciples,
    rationale,
    remediation_path,
  };
}
