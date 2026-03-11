/**
 * Canon Context Builder — Sprint 141
 * Builds retrieval contexts for agent contract integration.
 */

export interface CanonContextInput {
  agent_type: string;
  task_type: string;
  domain_hints?: string[];
  stack_hints?: string[];
  practice_type_hints?: string[];
  coordination_context?: string;
}

export interface CanonContext {
  required_domains: string[];
  optional_domains: string[];
  required_practice_types: string[];
  fallback_posture: string;
  confidence_threshold: number;
  max_entries: number;
  context_label: string;
}

const AGENT_CONTEXT_DEFAULTS: Record<string, Partial<CanonContext>> = {
  architecture: {
    required_practice_types: ["architecture_pattern", "best_practice"],
    confidence_threshold: 0.6,
    max_entries: 5,
  },
  build: {
    required_practice_types: ["implementation_pattern", "template", "checklist"],
    confidence_threshold: 0.5,
    max_entries: 8,
  },
  validation: {
    required_practice_types: ["validation_rule", "checklist", "anti_pattern"],
    confidence_threshold: 0.4,
    max_entries: 10,
  },
  evolution: {
    required_practice_types: ["migration_note", "methodology_guideline"],
    confidence_threshold: 0.5,
    max_entries: 5,
  },
  coordination: {
    required_practice_types: ["methodology_guideline", "best_practice"],
    confidence_threshold: 0.5,
    max_entries: 5,
  },
};

export function buildCanonContext(input: CanonContextInput): CanonContext {
  const defaults = AGENT_CONTEXT_DEFAULTS[input.agent_type] || {};

  return {
    required_domains: input.domain_hints || [],
    optional_domains: [],
    required_practice_types: input.practice_type_hints || defaults.required_practice_types || [],
    fallback_posture: "degrade_gracefully",
    confidence_threshold: defaults.confidence_threshold || 0.5,
    max_entries: defaults.max_entries || 10,
    context_label: `${input.agent_type}/${input.task_type}`,
  };
}
