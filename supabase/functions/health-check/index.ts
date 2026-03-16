import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const headers = getCorsHeaders(req);
  const started = Date.now();

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
      ? { status: "degraded", latency_ms: Date.now() - dbStart, error: error.message }
      : { status: "healthy", latency_ms: Date.now() - dbStart };
  } catch (e) {
    checks.database = { status: "unhealthy", error: e instanceof Error ? e.message : "unknown" };
  }

  // ── Environment config ──
  const requiredEnvs = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY"];
  const missingEnvs = requiredEnvs.filter(k => !Deno.env.get(k));
  checks.environment = missingEnvs.length === 0
    ? { status: "healthy" }
    : { status: "unhealthy", error: `Missing: ${missingEnvs.join(", ")}` };

  // ── Lovable API key ──
  checks.ai_provider = Deno.env.get("LOVABLE_API_KEY")
    ? { status: "healthy" }
    : { status: "degraded", error: "LOVABLE_API_KEY not configured — AI features unavailable" };

  // ── Overall status ──
  const statuses = Object.values(checks).map(c => c.status);
  const overall = statuses.includes("unhealthy") ? "unhealthy"
    : statuses.includes("degraded") ? "degraded"
    : "healthy";

  const httpStatus = overall === "unhealthy" ? 503 : 200;

  return new Response(JSON.stringify({
    status: overall,
    checks,
    timestamp: new Date().toISOString(),
    total_latency_ms: Date.now() - started,
  }), {
    status: httpStatus,
    headers: { ...headers, "Content-Type": "application/json" },
  });
});
