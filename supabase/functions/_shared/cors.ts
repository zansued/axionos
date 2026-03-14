// Shared CORS headers for all edge functions
// Configure allowed origins via ALLOWED_ORIGINS env var (comma-separated)
// Example: ALLOWED_ORIGINS=https://meuapp.com,https://staging.meuapp.com

const FALLBACK_ORIGINS = [
  "https://synkraios.lovable.app",
  "https://id-preview--ccef78df-1438-43ec-94d2-4ad01c14fb3a.lovable.app",
  "https://ccef78df-1438-43ec-94d2-4ad01c14fb3a.lovableproject.com",
  "https://axionos.com",
  "https://axionos.vercel.app",
  "https://aios.techstorebrasil.com",
];

function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return FALLBACK_ORIGINS;
}

function resolveOrigin(requestOrigin: string | null): string {
  if (!requestOrigin) return getAllowedOrigins()[0];
  const allowed = getAllowedOrigins();
  return allowed.includes(requestOrigin) ? requestOrigin : allowed[0];
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = resolveOrigin(req.headers.get("Origin"));
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// Keep corsHeaders as a named export for backwards compatibility
// It will be used as a fallback where req is not available
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

/** Standard JSON response with dynamic CORS headers */
export function jsonResponse(data: unknown, status = 200, req?: Request): Response {
  const headers = req ? getCorsHeaders(req) : corsHeaders;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/** Standard error response */
export function errorResponse(message: string, status = 500, req?: Request): Response {
  return jsonResponse({ error: message }, status, req);
}

/**
 * Normalized error for tenant-scoped resource lookups.
 * Returns the same generic message for both "not found" and "access denied"
 * to prevent cross-tenant existence inference.
 * Sprint 199: Inference resistance
 */
export function notFoundOrForbiddenResponse(resourceType = "Resource", req?: Request): Response {
  return jsonResponse({ error: `${resourceType} not found or access denied` }, 404, req);
}

/** Handle OPTIONS preflight */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: getCorsHeaders(req) });
  }
  return null;
}
