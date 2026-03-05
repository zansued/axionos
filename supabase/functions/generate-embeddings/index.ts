// Embedding Sync — generates embeddings for unembedded brain nodes
// Called after execution completes or on-demand

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog } from "../_shared/pipeline-helpers.ts";
import { batchEmbedNodes } from "../_shared/embedding-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "generate-embeddings");
  if (result instanceof Response) return result;
  const { initiative, ctx, apiKey } = result;

  try {
    await pipelineLog(ctx, "embeddings_start", "Gerando embeddings para nós do Project Brain");

    const { embedded, failed } = await batchEmbedNodes(ctx, apiKey, 50);

    await pipelineLog(ctx, "embeddings_complete",
      `Embeddings gerados: ${embedded} sucesso, ${failed} falhas`,
      { embedded, failed }
    );

    return jsonResponse({
      success: true,
      embedded,
      failed,
      initiative_id: ctx.initiativeId,
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
