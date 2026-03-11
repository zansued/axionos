/**
 * purple-learning-synthesizer.ts
 * Synthesizes red/blue team evidence into security canon candidates.
 */

export interface SynthesisInput {
  incident_type: string;
  severity: string;
  target_surface: string;
  what_resisted: string[];
  what_failed: string[];
  what_was_fragile: string[];
  response_actions: string[];
  threat_domain: string;
}

export interface SecurityCanonCandidate {
  pattern_type: string;
  domain: string;
  summary: string;
  when_to_use: string;
  when_not_to_use: string;
  guidance: string;
  confidence_score: number;
}

export function synthesizeLearning(input: SynthesisInput): SecurityCanonCandidate[] {
  const candidates: SecurityCanonCandidate[] = [];

  // From what resisted — create secure patterns
  for (const item of input.what_resisted) {
    candidates.push({
      pattern_type: "secure_implementation_pattern",
      domain: input.target_surface,
      summary: `Validated resilience of "${item}" under ${input.incident_type} pressure.`,
      when_to_use: `When implementing ${input.target_surface} components that face ${input.threat_domain} threats.`,
      when_not_to_use: "When the surface is not exposed to adversarial input.",
      guidance: `Maintain and reinforce "${item}" as a proven defensive control. Source: ${input.incident_type} (${input.severity}).`,
      confidence_score: input.severity === "critical" ? 90 : input.severity === "high" ? 80 : 65,
    });
  }

  // From what failed — create anti-patterns
  for (const item of input.what_failed) {
    candidates.push({
      pattern_type: "anti_pattern",
      domain: input.target_surface,
      summary: `"${item}" failed under ${input.incident_type} — avoid or harden.`,
      when_to_use: "N/A — this is an anti-pattern to avoid.",
      when_not_to_use: `Avoid relying on "${item}" without additional hardening in ${input.threat_domain} contexts.`,
      guidance: `"${item}" was breached during ${input.incident_type}. Replace or reinforce with validated alternatives.`,
      confidence_score: input.severity === "critical" ? 95 : 80,
    });
  }

  // From what was fragile — create hardening checklists
  for (const item of input.what_was_fragile) {
    candidates.push({
      pattern_type: "hardening_checklist",
      domain: input.target_surface,
      summary: `"${item}" showed fragility under ${input.incident_type} — needs hardening.`,
      when_to_use: `When deploying or modifying ${input.target_surface} in ${input.threat_domain} contexts.`,
      when_not_to_use: "When the component is fully isolated from the threat surface.",
      guidance: `Add defensive depth to "${item}". Consider additional validation, rate limiting, or boundary checks.`,
      confidence_score: input.severity === "critical" ? 85 : 60,
    });
  }

  return candidates;
}
