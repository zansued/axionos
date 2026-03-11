/**
 * security-pattern-builder.ts
 * Builds structured security pattern entries from canon candidates.
 */

export interface PatternBuildInput {
  pattern_type: string;
  domain: string;
  summary: string;
  when_to_use: string;
  when_not_to_use: string;
  guidance: string;
  confidence_score: number;
  agent_types?: string[];
}

export interface SecurityPatternEntry {
  title: string;
  domain: string;
  pattern_type: string;
  summary: string;
  when_to_use: string;
  when_not_to_use: string;
  guidance: string;
  agent_types: string[];
  confidence_score: number;
}

const AGENT_TYPE_MAP: Record<string, string[]> = {
  secure_architecture_pattern: ["ArchitectureAgent"],
  secure_implementation_pattern: ["BuildAgent"],
  validation_rule: ["ValidationAgent"],
  anti_pattern: ["BuildAgent", "ValidationAgent"],
  hardening_checklist: ["BuildAgent", "ValidationAgent"],
  tenant_isolation_rule: ["ArchitectureAgent", "BuildAgent"],
  contract_safety_guideline: ["CoordinationAgent"],
  incident_response_guideline: ["CoordinationAgent"],
};

export function buildPattern(input: PatternBuildInput): SecurityPatternEntry {
  const agents = input.agent_types ?? AGENT_TYPE_MAP[input.pattern_type] ?? ["BuildAgent"];
  const titlePrefix = input.pattern_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return {
    title: `${titlePrefix}: ${input.summary.slice(0, 60)}`,
    domain: input.domain,
    pattern_type: input.pattern_type,
    summary: input.summary,
    when_to_use: input.when_to_use,
    when_not_to_use: input.when_not_to_use,
    guidance: input.guidance,
    agent_types: agents,
    confidence_score: input.confidence_score,
  };
}
