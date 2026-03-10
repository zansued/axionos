/**
 * Autonomy Explainer — Sprint 121
 * Generates human-readable explanations for autonomy posture.
 */

export interface AutonomyPosture {
  domain_name: string;
  current_level: number;
  max_level: number;
  evidence_score: number;
  rollback_dependence: number;
  incident_penalty: number;
  validation_rate: number;
  doctrine_alignment: number;
  allowed_actions: string[];
  blocked_actions: string[];
}

export function explainPosture(posture: AutonomyPosture): string {
  const lines: string[] = [];
  lines.push(`## Autonomy Posture: ${posture.domain_name}`);
  lines.push(`**Current Level:** ${posture.current_level} / ${posture.max_level}`);
  lines.push("");
  lines.push("### Evidence Summary");
  lines.push(`- Evidence score: ${(posture.evidence_score * 100).toFixed(0)}%`);
  lines.push(`- Validation success rate: ${(posture.validation_rate * 100).toFixed(0)}%`);
  lines.push(`- Doctrine alignment: ${(posture.doctrine_alignment * 100).toFixed(0)}%`);
  lines.push(`- Rollback dependence: ${(posture.rollback_dependence * 100).toFixed(0)}%`);
  lines.push(`- Incident penalty: ${(posture.incident_penalty * 100).toFixed(0)}%`);
  lines.push("");

  if (posture.allowed_actions.length > 0) {
    lines.push("### Allowed Actions");
    posture.allowed_actions.forEach((a) => lines.push(`- ✅ ${a}`));
  }

  if (posture.blocked_actions.length > 0) {
    lines.push("");
    lines.push("### Blocked Actions");
    posture.blocked_actions.forEach((a) => lines.push(`- 🚫 ${a}`));
  }

  lines.push("");
  lines.push("### Governance Note");
  lines.push("Autonomy is evidence-based and reversible. Structural mutations always require human approval regardless of autonomy level.");

  return lines.join("\n");
}
