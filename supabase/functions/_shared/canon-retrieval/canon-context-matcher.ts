/**
 * canon-context-matcher.ts
 * Matches canon entries to execution context (pipeline stage, task type, agent role).
 */

export interface ExecutionContext {
  pipelineStage?: string;
  taskType?: string;
  agentType?: string;
  artifactType?: string;
  stack?: string;
  language?: string;
  framework?: string;
  problemDomain?: string;
}

export interface ContextBinding {
  canonEntryId: string;
  bindingType: string;
  bindingTarget: string;
  priority: number;
  autoInject: boolean;
  conditions: Record<string, unknown>;
  enabled: boolean;
}

export interface ContextMatchResult {
  canonEntryId: string;
  matchScore: number;
  matchReasons: string[];
  binding?: ContextBinding;
}

export function matchContextToBindings(
  context: ExecutionContext,
  bindings: ContextBinding[]
): ContextMatchResult[] {
  const results: ContextMatchResult[] = [];

  for (const binding of bindings) {
    if (!binding.enabled) continue;

    const matchReasons: string[] = [];
    let score = 0;

    // Match by binding type
    if (binding.bindingType === 'stage' && context.pipelineStage === binding.bindingTarget) {
      score += 0.4;
      matchReasons.push(`Stage match: ${binding.bindingTarget}`);
    }
    if (binding.bindingType === 'task_type' && context.taskType === binding.bindingTarget) {
      score += 0.3;
      matchReasons.push(`Task type match: ${binding.bindingTarget}`);
    }
    if (binding.bindingType === 'agent_type' && context.agentType === binding.bindingTarget) {
      score += 0.3;
      matchReasons.push(`Agent type match: ${binding.bindingTarget}`);
    }
    if (binding.bindingType === 'artifact_type' && context.artifactType === binding.bindingTarget) {
      score += 0.2;
      matchReasons.push(`Artifact type match: ${binding.bindingTarget}`);
    }

    // Check additional conditions
    if (binding.conditions && Object.keys(binding.conditions).length > 0) {
      const condScore = evaluateConditions(binding.conditions, context);
      score += condScore * 0.2;
      if (condScore > 0) matchReasons.push('Condition match');
    }

    // Priority boost
    score += Math.min(binding.priority * 0.05, 0.15);

    if (score > 0) {
      results.push({
        canonEntryId: binding.canonEntryId,
        matchScore: Math.min(score, 1.0),
        matchReasons,
        binding,
      });
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

function evaluateConditions(conditions: Record<string, unknown>, context: ExecutionContext): number {
  let matched = 0;
  let total = 0;
  for (const [key, value] of Object.entries(conditions)) {
    total++;
    if ((context as any)[key] === value) matched++;
  }
  return total > 0 ? matched / total : 0;
}

export function shouldAutoInject(binding: ContextBinding, matchScore: number): boolean {
  return binding.autoInject && binding.enabled && matchScore >= 0.3;
}
