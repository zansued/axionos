// Architecture Subjob Retry — retries a single failed subjob
// Invokes the main pipeline-architecture with retry parameters.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("Unauthorized", 401);
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  const { initiativeId, subjobKey, jobId } = body;

  if (!initiativeId || !subjobKey || !jobId) {
    return errorResponse("initiativeId, subjobKey, and jobId are required", 400);
  }

  // Validate the subjob exists and belongs to this initiative
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subjob, error: subjobErr } = await serviceClient
    .from("pipeline_subjobs")
    .select("id, status, attempt_number, max_attempts")
    .eq("job_id", jobId)
    .eq("subjob_key", subjobKey)
    .single();

  if (subjobErr || !subjob) {
    return errorResponse("Subjob not found", 404);
  }

  if (!["failed", "failed_timeout", "retryable", "blocked"].includes(subjob.status)) {
    return errorResponse(`Subjob cannot be retried (status: ${subjob.status})`, 400);
  }

  if (subjob.attempt_number >= subjob.max_attempts) {
    return errorResponse(`Max retry attempts (${subjob.max_attempts}) reached`, 400);
  }

  // Mark manual retry cause for observability
  await serviceClient
    .from("pipeline_subjobs")
    .update({ retry_trigger: "manual" })
    .eq("id", subjob.id);

  // Invoke the pipeline-architecture function with retry params
  const { data, error } = await userClient.functions.invoke("pipeline-architecture", {
    body: {
      initiativeId,
      retrySubjobKey: subjobKey,
      existingJobId: jobId,
    },
  });

  if (error) {
    return errorResponse(`Retry invocation failed: ${error.message}`, 500);
  }

  return jsonResponse({
    success: true,
    message: `Retry initiated for ${subjobKey}`,
    result: data,
  });
});
