/**
 * frontend-errors — Sprint 2
 * Lightweight ingestion endpoint for client-side error reports.
 * Stores to frontend_error_reports table.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VALID_SOURCES = ["runtime", "promise", "render", "lazy", "manual"];
const VALID_SEVERITIES = ["info", "warning", "error", "fatal"];

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, req);
  }

  try {
    const body = await req.json();

    // Basic validation
    if (!body.message || typeof body.message !== "string") {
      return errorResponse("message is required", 400, req);
    }

    const report = {
      message: String(body.message).slice(0, 1000),
      stack: body.stack ? String(body.stack).slice(0, 4000) : null,
      severity: VALID_SEVERITIES.includes(body.severity) ? body.severity : "error",
      source: VALID_SOURCES.includes(body.source) ? body.source : "manual",
      route: body.route ? String(body.route).slice(0, 500) : null,
      user_agent: body.user_agent ? String(body.user_agent).slice(0, 500) : null,
      user_id: body.user_id || null,
      organization_id: body.organization_id || null,
      component: body.component ? String(body.component).slice(0, 200) : null,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      reported_at: body.timestamp || new Date().toISOString(),
    };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error } = await supabase.from("frontend_error_reports").insert(report);

    if (error) {
      console.error("[frontend-errors] Insert failed:", error.message);
      return errorResponse("Failed to store report", 500, req);
    }

    return jsonResponse({ ok: true }, 200, req);
  } catch (err) {
    console.error("[frontend-errors] Unexpected error:", err);
    return errorResponse("Internal error", 500, req);
  }
});
