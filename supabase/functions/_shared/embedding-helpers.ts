/**
 * Embedding helpers for Project Brain nodes
 *
 * Uses Lovable AI Gateway to generate text embeddings for semantic search.
 * Embeddings are stored in the `embedding` column (vector(768)) of project_brain_nodes.
 */

import type { PipelineContext } from "./pipeline-helpers.ts";

const EMBEDDING_MODEL = "google/gemini-2.5-flash";
const EMBEDDING_DIMENSION = 768;

/**
 * Generate an embedding for a text using the AI gateway.
 * Falls back to a simple TF-IDF-like approach if the AI call fails.
 */
export async function generateEmbedding(
  apiKey: string,
  text: string,
): Promise<{ embedding: number[]; model: string }> {
  // Use the Lovable AI gateway to get embeddings via a prompt trick:
  // Ask the model to produce a numeric representation
  const url = "https://api.lovable.dev/v1/chat/completions";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an embedding encoder. Given code/text, output ONLY a JSON array of exactly ${EMBEDDING_DIMENSION} float numbers between -1 and 1 that represent the semantic meaning. No other text. Focus on: purpose, dependencies, data types, APIs used, component relationships.`,
          },
          {
            role: "user",
            content: text.slice(0, 4000),
          },
        ],
        temperature: 0,
        max_tokens: 8000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Try to parse the embedding array
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length === EMBEDDING_DIMENSION) {
          // Normalize
          const norm = Math.sqrt(parsed.reduce((s: number, v: number) => s + v * v, 0)) || 1;
          const normalized = parsed.map((v: number) => v / norm);
          return { embedding: normalized, model: EMBEDDING_MODEL };
        }
      }
    }
  } catch (e) {
    console.warn("[embeddings] AI embedding failed, using fallback:", e);
  }

  // Fallback: deterministic hash-based embedding
  return { embedding: hashEmbedding(text), model: "hash-fallback" };
}

/**
 * Deterministic hash-based embedding fallback.
 * Not great for semantic search but better than nothing.
 */
function hashEmbedding(text: string): number[] {
  const embedding = new Array(EMBEDDING_DIMENSION).fill(0);
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) & 0xffffffff;
    }
    // Distribute across dimensions
    for (let d = 0; d < EMBEDDING_DIMENSION; d++) {
      const idx = ((hash >>> 0) + d * 31) % EMBEDDING_DIMENSION;
      embedding[idx] += Math.sin(hash + d) * 0.1;
    }
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((s: number, v: number) => s + v * v, 0)) || 1;
  return embedding.map((v: number) => v / norm);
}

/**
 * Generate and store embedding for a brain node.
 */
export async function embedBrainNode(
  ctx: PipelineContext,
  nodeId: string,
  text: string,
  apiKey: string,
): Promise<void> {
  const { embedding, model } = await generateEmbedding(apiKey, text);
  
  // Format as pgvector string: [0.1,0.2,...]
  const vectorStr = `[${embedding.join(",")}]`;
  
  await ctx.serviceClient
    .from("project_brain_nodes")
    .update({
      embedding: vectorStr,
      embedding_model: model,
      embedded_at: new Date().toISOString(),
    } as any)
    .eq("id", nodeId);
}

/**
 * Batch embed all unembedded nodes for an initiative.
 */
export async function batchEmbedNodes(
  ctx: PipelineContext,
  apiKey: string,
  limit = 30,
): Promise<{ embedded: number; failed: number }> {
  const { data: nodes } = await ctx.serviceClient
    .rpc("get_unembedded_nodes", {
      p_initiative_id: ctx.initiativeId,
      p_limit: limit,
    });

  let embedded = 0, failed = 0;

  for (const node of (nodes || [])) {
    try {
      // Build text from node metadata + file info
      const parts = [
        `File: ${node.file_path || node.name}`,
        `Type: ${node.node_type}`,
      ];
      if (node.metadata && typeof node.metadata === "object") {
        const meta = node.metadata as Record<string, unknown>;
        if (meta.description) parts.push(`Description: ${meta.description}`);
        if (meta.exports) parts.push(`Exports: ${JSON.stringify(meta.exports)}`);
      }
      
      await embedBrainNode(ctx, node.id, parts.join("\n"), apiKey);
      embedded++;
    } catch (e) {
      console.warn(`[embeddings] Failed to embed node ${node.id}:`, e);
      failed++;
    }
  }

  return { embedded, failed };
}

/**
 * Semantic search: find brain nodes similar to a query.
 */
export async function semanticSearch(
  ctx: PipelineContext,
  queryText: string,
  apiKey: string,
  threshold = 0.4,
  limit = 10,
): Promise<Array<{
  id: string;
  name: string;
  file_path: string | null;
  node_type: string;
  similarity: number;
}>> {
  const { embedding } = await generateEmbedding(apiKey, queryText);
  const vectorStr = `[${embedding.join(",")}]`;

  const { data, error } = await ctx.serviceClient
    .rpc("match_brain_nodes", {
      query_embedding: vectorStr,
      match_initiative_id: ctx.initiativeId,
      match_threshold: threshold,
      match_count: limit,
    });

  if (error) {
    console.warn("[embeddings] Semantic search failed:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    file_path: r.file_path,
    node_type: r.node_type,
    similarity: r.similarity,
  }));
}
