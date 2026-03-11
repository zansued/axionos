/**
 * security-anti-pattern-detector.ts
 * Detects and classifies anti-patterns from incident/simulation evidence.
 */

export interface AntiPatternInput {
  failed_items: string[];
  fragile_items: string[];
  incident_type: string;
  severity: string;
}

export interface DetectedAntiPattern {
  anti_pattern_name: string;
  description: string;
  why_dangerous: string;
  alternative_guidance: string;
  detection_hint: string;
  severity: string;
  confidence_score: number;
}

export function detectAntiPatterns(input: AntiPatternInput): DetectedAntiPattern[] {
  const results: DetectedAntiPattern[] = [];

  for (const item of input.failed_items) {
    results.push({
      anti_pattern_name: `Failed: ${item}`,
      description: `"${item}" failed under ${input.incident_type} simulation/incident.`,
      why_dangerous: `Direct failure under adversarial pressure indicates structural weakness in "${item}".`,
      alternative_guidance: `Replace or reinforce "${item}" with a validated, defense-in-depth alternative.`,
      detection_hint: `Monitor "${item}" for repeated failure patterns in runtime validation logs.`,
      severity: input.severity,
      confidence_score: input.severity === "critical" ? 95 : input.severity === "high" ? 85 : 70,
    });
  }

  for (const item of input.fragile_items) {
    results.push({
      anti_pattern_name: `Fragile: ${item}`,
      description: `"${item}" showed fragility under ${input.incident_type} — not yet failed but unreliable.`,
      why_dangerous: `Fragile components degrade under sustained pressure and may fail unpredictably.`,
      alternative_guidance: `Add defensive layers around "${item}" — rate limiting, input validation, boundary checks.`,
      detection_hint: `Track fragility signals for "${item}" across simulation runs.`,
      severity: input.severity === "critical" ? "high" : "medium",
      confidence_score: input.severity === "critical" ? 80 : 55,
    });
  }

  return results;
}
