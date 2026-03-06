/**
 * Prompt Compression Engine — AI Efficiency Layer
 *
 * Compresses engineering context before sending to LLMs.
 * Preserves: architecture decisions, dependency constraints,
 * unresolved errors, build config, system rules.
 * Removes: verbose logs, explanations, redundant text.
 *
 * Uses lightweight model (gemini-2.5-flash-lite) to summarize.
 */

import { getAIConfig } from "./ai-client.ts";

export interface CompressionResult {
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  ratio: number;
  usedAI: boolean;
}

/** Approximate token count (1 token ≈ 4 chars) */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Rule-based pre-compression: removes noise before AI summarization.
 */
function preCompress(text: string): string {
  let result = text;

  // Remove console.log/warn/error lines
  result = result.replace(/^\s*console\.(log|warn|error|info|debug)\(.*\);?\s*$/gm, "");

  // Remove inline comments that are just explanations (not TODOs/FIXMEs)
  result = result.replace(/^\s*\/\/\s*(?!TODO|FIXME|HACK|NOTE|IMPORTANT|WARNING|BUG).*$/gm, "");

  // Remove empty lines (collapse to single)
  result = result.replace(/\n{3,}/g, "\n\n");

  // Remove markdown verbose explanations (paragraphs > 3 lines without code)
  result = result.replace(/^(?![-*#>|`]|\s*\d+\.)(?:[A-Z][\s\S]*?\n){4,}/gm, (match) => {
    // Keep first sentence only
    const firstSentence = match.match(/^[^.!?]*[.!?]/)?.[0] || match.slice(0, 120);
    return firstSentence.trim() + "\n";
  });

  // Remove repeated separator lines
  result = result.replace(/([-=]{3,}\n){2,}/g, "---\n");

  // Trim trailing whitespace per line
  result = result.replace(/[ \t]+$/gm, "");

  return result.trim();
}

/**
 * Extract critical context markers that must be preserved.
 */
function extractCriticalMarkers(text: string): string[] {
  const markers: string[] = [];

  // Architecture decisions
  const adrMatches = text.match(/(?:ADR|decision|architecture)[：:]\s*[^\n]+/gi);
  if (adrMatches) markers.push(...adrMatches.slice(0, 10));

  // Dependency constraints
  const depMatches = text.match(/(?:depends on|requires|peer dependency|version)[：:]\s*[^\n]+/gi);
  if (depMatches) markers.push(...depMatches.slice(0, 10));

  // Errors
  const errMatches = text.match(/(?:error|failure|bug|issue|broken)[：:]\s*[^\n]+/gi);
  if (errMatches) markers.push(...errMatches.slice(0, 10));

  // Build config
  const buildMatches = text.match(/(?:vite|webpack|tsconfig|build|bundle)[：:]\s*[^\n]+/gi);
  if (buildMatches) markers.push(...buildMatches.slice(0, 5));

  return markers;
}

/**
 * Compress a prompt/context using rule-based + AI summarization.
 *
 * @param text - The text to compress
 * @param apiKey - API key for the AI gateway
 * @param maxOutputTokens - Target compressed size in tokens
 * @param skipAI - If true, only use rule-based compression
 */
export async function compressPrompt(
  text: string,
  apiKey: string,
  maxOutputTokens = 2000,
  skipAI = false,
): Promise<CompressionResult> {
  const originalTokens = estimateTokens(text);

  // Skip compression for short texts
  if (originalTokens <= maxOutputTokens) {
    return {
      compressed: text,
      originalTokens,
      compressedTokens: originalTokens,
      ratio: 1,
      usedAI: false,
    };
  }

  // Phase 1: Rule-based pre-compression
  const preCompressed = preCompress(text);
  const preTokens = estimateTokens(preCompressed);

  // If rule-based is enough, return
  if (preTokens <= maxOutputTokens || skipAI) {
    return {
      compressed: preCompressed,
      originalTokens,
      compressedTokens: preTokens,
      ratio: preTokens / originalTokens,
      usedAI: false,
    };
  }

  // Phase 2: AI-powered summarization with lightweight model
  const config = getAIConfig();
  const effectiveKey = config.key || apiKey;
  const criticalMarkers = extractCriticalMarkers(preCompressed);

  const systemPrompt = `You are a technical context compressor for a software engineering AI pipeline.
Compress the following engineering context to ~${maxOutputTokens} tokens.

MUST PRESERVE:
- Architecture decisions and ADRs
- Dependency constraints and version requirements
- Unresolved errors and their root causes
- Build configuration details
- System rules and constraints
- Type signatures and interfaces
- File paths and module names

MUST REMOVE:
- Verbose explanations and rationale paragraphs
- Console logs and debug output
- Redundant information
- Style/formatting details
- Generic descriptions

Output ONLY the compressed context. No commentary.`;

  const userPrompt = `Critical markers to preserve:\n${criticalMarkers.join("\n")}\n\n---\n\nContext to compress:\n${preCompressed.slice(0, 15000)}`;

  try {
    const resp = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${effectiveKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxOutputTokens * 5,
        temperature: 0.1,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const compressed = data.choices?.[0]?.message?.content || preCompressed;
      const compressedTokens = estimateTokens(compressed);

      return {
        compressed,
        originalTokens,
        compressedTokens,
        ratio: compressedTokens / originalTokens,
        usedAI: true,
      };
    }
  } catch (e) {
    console.warn("[prompt-compressor] AI compression failed, using rule-based:", e);
  }

  // Fallback to rule-based result
  return {
    compressed: preCompressed.slice(0, maxOutputTokens * 4),
    originalTokens,
    compressedTokens: estimateTokens(preCompressed.slice(0, maxOutputTokens * 4)),
    ratio: Math.min(1, (maxOutputTokens * 4) / (originalTokens * 4)),
    usedAI: false,
  };
}
