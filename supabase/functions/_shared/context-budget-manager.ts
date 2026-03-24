/**
 * Context Budget Manager — Sprint 218
 * 
 * Intelligently allocates token budgets across context sections
 * to prevent LLM truncation in large initiatives.
 * 
 * Priority order (highest to lowest):
 *   1. Current File spec (task description, guardrails)
 *   2. Direct dependency interfaces (from smart-context)
 *   3. File manifest (list of all files)
 *   4. Architecture/PRD snippets
 *   5. Brain context & memory
 *   6. Semantic matches
 *   7. Other generated code
 *   8. Project structure (tree)
 * 
 * Each section gets a % allocation that scales with total budget.
 * When a section underflows, surplus is redistributed to lower priorities.
 */

export interface ContextSection {
  key: string;
  priority: number;        // 1 = highest
  content: string;
  maxAllocation: number;   // fraction of total budget (0-1)
  required: boolean;       // if true, never truncated below minChars
  minChars: number;
}

export interface BudgetResult {
  sections: { key: string; original: number; allocated: number; truncated: boolean }[];
  assembledContext: string;
  totalOriginal: number;
  totalAllocated: number;
  budgetUtilization: number;
  overflow: boolean;
}

/** Estimate tokens from char count (1 token ≈ 4 chars) */
function charsToTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

function tokensToChars(tokens: number): number {
  return tokens * 4;
}

/**
 * Default budget profile for code generation tasks.
 * Total budget adapts based on model context window.
 */
export function getDefaultBudgetProfile(modelContextWindow = 32000): ContextBudgetProfile {
  // Reserve 30% for system prompt + response
  const usableBudget = Math.floor(modelContextWindow * 0.7);
  
  return {
    totalTokenBudget: usableBudget,
    allocations: {
      task_spec:      { fraction: 0.10, required: true,  minTokens: 200 },
      guardrails:     { fraction: 0.05, required: true,  minTokens: 100 },
      dependencies:   { fraction: 0.30, required: false, minTokens: 0 },
      manifest:       { fraction: 0.05, required: true,  minTokens: 50 },
      architecture:   { fraction: 0.12, required: false, minTokens: 0 },
      prd:            { fraction: 0.08, required: false, minTokens: 0 },
      brain_memory:   { fraction: 0.10, required: false, minTokens: 0 },
      supabase_info:  { fraction: 0.05, required: false, minTokens: 0 },
      project_tree:   { fraction: 0.05, required: false, minTokens: 0 },
      other_context:  { fraction: 0.10, required: false, minTokens: 0 },
    },
  };
}

export interface ContextBudgetProfile {
  totalTokenBudget: number;
  allocations: Record<string, { fraction: number; required: boolean; minTokens: number }>;
}

/**
 * Allocate context budget across sections using priority-based waterfall.
 * 
 * Algorithm:
 * 1. Calculate ideal allocation per section
 * 2. Sections that use less than their allocation release surplus
 * 3. Surplus is redistributed to sections that need more (by priority)
 * 4. Sections exceeding final allocation are truncated intelligently
 */
export function allocateContextBudget(
  sections: Record<string, string>,
  profile: ContextBudgetProfile,
): BudgetResult {
  const totalBudgetChars = tokensToChars(profile.totalTokenBudget);
  const results: BudgetResult["sections"] = [];
  const allocated: Record<string, { content: string; budgetChars: number }> = {};

  // Phase 1: Initial allocation
  let surplus = 0;
  const needsMore: { key: string; deficit: number; priority: number }[] = [];

  const sortedKeys = Object.keys(profile.allocations).sort((a, b) => {
    const priorities: Record<string, number> = {
      task_spec: 1, guardrails: 2, dependencies: 3, manifest: 4,
      architecture: 5, prd: 6, brain_memory: 7, supabase_info: 8,
      project_tree: 9, other_context: 10,
    };
    return (priorities[a] || 99) - (priorities[b] || 99);
  });

  for (const key of sortedKeys) {
    const alloc = profile.allocations[key];
    const content = sections[key] || "";
    const idealChars = Math.floor(totalBudgetChars * alloc.fraction);
    const contentLen = content.length;
    const minChars = tokensToChars(alloc.minTokens);

    if (contentLen <= idealChars) {
      // Underflow: section fits within allocation
      allocated[key] = { content, budgetChars: contentLen };
      surplus += idealChars - contentLen;
    } else {
      // Overflow: needs more than allocated
      allocated[key] = { content, budgetChars: idealChars };
      needsMore.push({
        key,
        deficit: contentLen - idealChars,
        priority: sortedKeys.indexOf(key),
      });
    }
  }

  // Phase 2: Redistribute surplus by priority
  needsMore.sort((a, b) => a.priority - b.priority);
  for (const item of needsMore) {
    if (surplus <= 0) break;
    const extra = Math.min(item.deficit, surplus);
    allocated[item.key].budgetChars += extra;
    surplus -= extra;
  }

  // Phase 3: Truncate and assemble
  const assembledParts: string[] = [];
  let totalOriginal = 0;
  let totalAllocated = 0;
  let overflow = false;

  for (const key of sortedKeys) {
    const entry = allocated[key];
    if (!entry) continue;
    const content = entry.content;
    const budget = entry.budgetChars;
    totalOriginal += content.length;

    let finalContent: string;
    let truncated = false;

    if (content.length <= budget) {
      finalContent = content;
    } else {
      // Smart truncation: preserve structure
      finalContent = smartTruncate(content, budget, key);
      truncated = true;
      overflow = true;
    }

    totalAllocated += finalContent.length;
    if (finalContent.trim()) {
      assembledParts.push(finalContent);
    }

    results.push({
      key,
      original: content.length,
      allocated: finalContent.length,
      truncated,
    });
  }

  return {
    sections: results,
    assembledContext: assembledParts.join("\n\n"),
    totalOriginal,
    totalAllocated,
    budgetUtilization: totalBudgetChars > 0 ? Math.round((totalAllocated / totalBudgetChars) * 100) : 0,
    overflow,
  };
}

/**
 * Smart truncation that preserves structural integrity.
 * Different strategies per section type.
 */
function smartTruncate(content: string, maxChars: number, sectionKey: string): string {
  if (content.length <= maxChars) return content;

  switch (sectionKey) {
    case "dependencies": {
      // Keep imports and export signatures, drop function bodies
      const lines = content.split("\n");
      const kept: string[] = [];
      let size = 0;
      for (const line of lines) {
        // Prioritize: imports, exports, type/interface lines
        const isImportant = /^(import |export |\/\/|---|\s*(type|interface|function|const|class)\s)/.test(line);
        if (isImportant || size < maxChars * 0.8) {
          kept.push(line);
          size += line.length + 1;
          if (size >= maxChars) break;
        }
      }
      return kept.join("\n").slice(0, maxChars);
    }

    case "architecture":
    case "prd": {
      // Keep headings and first lines of each section
      const lines = content.split("\n");
      const kept: string[] = [];
      let size = 0;
      let skipBody = false;
      for (const line of lines) {
        const isHeading = /^#{1,4}\s/.test(line) || /^[-*]\s/.test(line);
        if (isHeading) {
          skipBody = false;
          kept.push(line);
          size += line.length + 1;
        } else if (!skipBody) {
          kept.push(line);
          size += line.length + 1;
          if (size > maxChars * 0.3) skipBody = true;
        }
        if (size >= maxChars) break;
      }
      return kept.join("\n").slice(0, maxChars);
    }

    case "project_tree": {
      // Keep first N lines (top of tree is most important)
      return content.slice(0, maxChars);
    }

    default:
      // Generic: keep beginning (most context-rich)
      return content.slice(0, maxChars - 20) + "\n\n// ... (truncated)";
  }
}

/**
 * Compute the recommended smart context token budget based on
 * the total number of files in the initiative.
 * Large projects get larger budgets (up to model limits).
 */
export function computeAdaptiveBudget(
  totalFiles: number,
  modelContextWindow = 32000,
): number {
  // Base: 12k tokens for small projects (<20 files)
  // Scale: +500 tokens per 10 files, capped at 70% of model window
  const base = 12000;
  const extra = Math.floor(totalFiles / 10) * 500;
  const maxUsable = Math.floor(modelContextWindow * 0.7);
  return Math.min(base + extra, maxUsable);
}

/**
 * Format budget stats for logging.
 */
export function formatBudgetLog(result: BudgetResult): string {
  const truncatedSections = result.sections
    .filter(s => s.truncated)
    .map(s => `${s.key}(${s.original}→${s.allocated})`)
    .join(", ");
  
  return `Budget: ${result.budgetUtilization}% used, ${result.totalOriginal}→${result.totalAllocated} chars` +
    (truncatedSections ? `, truncated: [${truncatedSections}]` : "");
}
