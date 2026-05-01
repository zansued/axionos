import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const started = Date.now();

  // Check if caller is authenticated for detailed response
  const authResult = await authenticate(req);
  const isAuthenticated = !(authResult instanceof Response);

  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // ── Database connectivity ──
  try {
    const dbStart = Date.now();
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { error } = await serviceClient
      .from("organizations")
      .select("id")
      .limit(1)
      .maybeSingle();

    checks.database = error
      ? { status: "degraded", latency_ms: Date.now() - dbStart }
      : { status: "healthy", latency_ms: Date.now() - dbStart };
  } catch (_e) {
    checks.database = { status: "unhealthy" };
  }

  // ── Overall status ──
  const statuses = Object.values(checks).map(c => c.status);
  const overall = statuses.includes("unhealthy") ? "unhealthy"
    : statuses.includes("degraded") ? "degraded"
    : "healthy";

  const httpStatus = overall === "unhealthy" ? 503 : 200;

  // Public: only status. Authenticated: include checks detail (no secret names).
  if (isAuthenticated) {
    return jsonResponse({
      status: overall,
      checks,
      timestamp: new Date().toISOString(),
      total_latency_ms: Date.now() - started,
    }, httpStatus, req);
  }

  return jsonResponse({ status: overall }, httpStatus, req);
});
