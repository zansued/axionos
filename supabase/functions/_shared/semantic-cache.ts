/**
 * Semantic Cache Engine — AI Efficiency Layer
 *
 * Vector-based cache that avoids redundant LLM calls.
 * Generates embedding of incoming prompt, searches for similar
 * cached prompts, and returns cached response if similarity > 0.92.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getAIConfig } from "./ai-client.ts";

export interface CacheHit {
  hit: true;
  response: string;
  similarity: number;
  cacheId: string;
  tokensSaved: number;
}

export interface CacheMiss {
  hit: false;
  promptHash: string;
  embedding: number[];
}

export type CacheResult = CacheHit | CacheMiss;

const EMBEDDING_DIM = 768;
const SIMILARITY_THRESHOLD = 0.92;

/**
 * Generate a deterministic hash for a prompt string.
 */
function hashPrompt(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash + char) & 0xffffffff;
  }
  return `ph_${(hash >>> 0).toString(36)}`;
}

/**
 * Generate embedding for prompt using lightweight model.
 */
async function generatePromptEmbedding(
  text: string,
  apiKey: string,
): Promise<number[]> {
  const config = getAIConfig();
  const effectiveKey = config.key || apiKey;

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
          {
            role: "system",
            content: `Output ONLY a JSON array of exactly ${EMBEDDING_DIM} floats between -1 and 1 representing the semantic meaning of the input. Focus on: intent, stage, domain, complexity, key entities. No other text.`,
          },
          { role: "user", content: text.slice(0, 3000) },
        ],
        temperature: 0,
        max_tokens: 8000,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || "";
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length === EMBEDDING_DIM) {
          const norm = Math.sqrt(parsed.reduce((s: number, v: number) => s + v * v, 0)) || 1;
          return parsed.map((v: number) => v / norm);
        }
      }
    }
  } catch (e) {
    console.warn("[semantic-cache] Embedding generation failed:", e);
  }

  // Fallback: deterministic hash embedding
  return hashEmbedding(text);
}

function hashEmbedding(text: string): number[] {
  const emb = new Array(EMBEDDING_DIM).fill(0);
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  for (const word of words) {
    let h = 0;
    for (let i = 0; i < word.length; i++) {
      h = ((h << 5) - h + word.charCodeAt(i)) & 0xffffffff;
    }
    for (let d = 0; d < EMBEDDING_DIM; d++) {
      emb[((h >>> 0) + d * 31) % EMBEDDING_DIM] += Math.sin(h + d) * 0.1;
    }
  }
  const norm = Math.sqrt(emb.reduce((s: number, v: number) => s + v * v, 0)) || 1;
  return emb.map((v: number) => v / norm);
}

/**
 * Get Supabase service client for cache operations.
 */
function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Look up the semantic cache for a similar prompt.
 *
 * @returns CacheHit if found with similarity > threshold, CacheMiss otherwise.
 */
export async function lookupCache(
  prompt: string,
  stage: string,
  apiKey: string,
  orgId?: string,
  threshold = SIMILARITY_THRESHOLD,
): Promise<CacheResult> {
  const promptHash = hashPrompt(prompt);
  const embedding = await generatePromptEmbedding(prompt, apiKey);
  const vectorStr = `[${embedding.join(",")}]`;

  const client = getServiceClient();

  // First try exact hash match (fastest)
  const { data: exactMatch } = await client
    .from("ai_prompt_cache")
    .select("id, response, model_used, tokens_saved")
    .eq("prompt_hash", promptHash)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  if (exactMatch) {
    // Bump hit count
    await client
      .from("ai_prompt_cache")
      .update({ hit_count: (exactMatch as any).hit_count + 1 } as any)
      .eq("id", exactMatch.id);

    return {
      hit: true,
      response: exactMatch.response,
      similarity: 1.0,
      cacheId: exactMatch.id,
      tokensSaved: exactMatch.tokens_saved || 0,
    };
  }

  // Vector similarity search
  const { data: matches } = await client.rpc("match_prompt_cache", {
    query_embedding: vectorStr,
    match_threshold: threshold,
    match_stage: stage,
    match_org_id: orgId || null,
  });

  if (matches && matches.length > 0) {
    const best = matches[0];

    // Bump hit count
    await client
      .from("ai_prompt_cache")
      .update({ hit_count: (best as any).hit_count + 1 } as any)
      .eq("id", best.id);

    return {
      hit: true,
      response: best.response,
      similarity: best.similarity,
      cacheId: best.id,
      tokensSaved: 0,
    };
  }

  return { hit: false, promptHash, embedding };
}

/**
 * Store a response in the semantic cache.
 */
export async function storeInCache(
  promptHash: string,
  embedding: number[],
  response: string,
  stage: string,
  modelUsed: string,
  tokensUsed: number,
  orgId?: string,
  initiativeId?: string,
): Promise<void> {
  const client = getServiceClient();
  const vectorStr = `[${embedding.join(",")}]`;

  await client.from("ai_prompt_cache").insert({
    prompt_hash: promptHash,
    embedding: vectorStr,
    response,
    stage,
    model_used: modelUsed,
    tokens_saved: tokensUsed,
    organization_id: orgId,
    initiative_id: initiativeId,
  } as any);
}

/**
 * Clean up expired cache entries.
 */
export async function cleanExpiredCache(): Promise<number> {
  const client = getServiceClient();
  const { data } = await client
    .from("ai_prompt_cache")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");

  return data?.length || 0;
}
