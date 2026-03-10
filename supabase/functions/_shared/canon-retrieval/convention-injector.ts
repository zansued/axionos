/**
 * convention-injector.ts
 * Injects approved conventions and guidance into agent prompts or planning context.
 * Bounded injection: never dumps entire canon, always selects relevant subsets.
 */

import type { ImplementationPattern } from "./implementation-pattern-library.ts";

export interface InjectionContext {
  pipelineStage: string;
  agentType: string;
  taskDescription?: string;
  maxTokenBudget?: number;
}

export interface InjectionBlock {
  header: string;
  content: string;
  sourceEntryIds: string[];
  tokenEstimate: number;
  injectionType: 'convention' | 'template' | 'anti_pattern' | 'guidance';
}

export interface InjectionResult {
  blocks: InjectionBlock[];
  totalTokenEstimate: number;
  entriesInjected: number;
  entriesSkipped: number;
  explanation: string;
}

const DEFAULT_MAX_TOKENS = 2000;

export function buildInjectionBlocks(
  patterns: ImplementationPattern[],
  context: InjectionContext
): InjectionResult {
  const maxTokens = context.maxTokenBudget ?? DEFAULT_MAX_TOKENS;
  const blocks: InjectionBlock[] = [];
  let totalTokens = 0;
  let skipped = 0;

  // Group by type for structured injection
  const conventions = patterns.filter(p => p.canonType === 'convention');
  const templates = patterns.filter(p => p.canonType === 'template' || p.canonType === 'pattern');
  const antiPatterns = patterns.filter(p => p.canonType === 'anti_pattern');
  const others = patterns.filter(p => !['convention', 'template', 'pattern', 'anti_pattern'].includes(p.canonType));

  // Anti-patterns first (safety)
  for (const ap of antiPatterns) {
    const block = createBlock(ap, 'anti_pattern');
    if (totalTokens + block.tokenEstimate <= maxTokens) {
      blocks.push(block);
      totalTokens += block.tokenEstimate;
    } else { skipped++; }
  }

  // Conventions
  for (const conv of conventions) {
    const block = createBlock(conv, 'convention');
    if (totalTokens + block.tokenEstimate <= maxTokens) {
      blocks.push(block);
      totalTokens += block.tokenEstimate;
    } else { skipped++; }
  }

  // Templates (guidance only, not full body)
  for (const tmpl of templates) {
    const block = createBlock(tmpl, 'template');
    if (totalTokens + block.tokenEstimate <= maxTokens) {
      blocks.push(block);
      totalTokens += block.tokenEstimate;
    } else { skipped++; }
  }

  // General guidance
  for (const other of others) {
    const block = createBlock(other, 'guidance');
    if (totalTokens + block.tokenEstimate <= maxTokens) {
      blocks.push(block);
      totalTokens += block.tokenEstimate;
    } else { skipped++; }
  }

  return {
    blocks,
    totalTokenEstimate: totalTokens,
    entriesInjected: blocks.length,
    entriesSkipped: skipped,
    explanation: `Injected ${blocks.length} canon entries (~${totalTokens} tokens) for ${context.pipelineStage}/${context.agentType}. ${skipped} entries skipped due to token budget.`,
  };
}

function createBlock(pattern: ImplementationPattern, type: InjectionBlock['injectionType']): InjectionBlock {
  const content = pattern.implementationGuidance || pattern.summary;
  const header = type === 'anti_pattern'
    ? `⚠ AVOID: ${pattern.title}`
    : `✓ ${pattern.title}`;

  return {
    header,
    content,
    sourceEntryIds: [pattern.canonEntryId],
    tokenEstimate: estimateTokens(header + content),
    injectionType: type,
  };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
