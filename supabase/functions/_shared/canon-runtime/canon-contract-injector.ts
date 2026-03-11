/**
 * Canon Contract Injector — Sprint 141
 * Extends agent task contracts with canon retrieval context.
 */

export interface TaskContract {
  task_type: string;
  agent_type: string;
  payload: Record<string, unknown>;
}

export interface CanonInjection {
  canon_retrieval_context: {
    required_domains: string[];
    optional_domains: string[];
    fallback_posture: string;
    confidence_threshold: number;
    max_entries: number;
  };
  canon_entries_available: boolean;
  canon_entries_count: number;
}

export interface EnrichedContract extends TaskContract {
  canon_injection: CanonInjection;
}

export function injectCanonContext(
  contract: TaskContract,
  canonContext: {
    required_domains: string[];
    optional_domains: string[];
    fallback_posture: string;
    confidence_threshold: number;
    max_entries: number;
  },
  entriesCount: number
): EnrichedContract {
  return {
    ...contract,
    canon_injection: {
      canon_retrieval_context: canonContext,
      canon_entries_available: entriesCount > 0,
      canon_entries_count: entriesCount,
    },
  };
}

export function shouldRetrieveCanon(contract: TaskContract): boolean {
  // All agent types can benefit from canon retrieval
  const canonAwareAgents = ["architecture", "build", "validation", "evolution", "coordination", "repair"];
  return canonAwareAgents.includes(contract.agent_type);
}
