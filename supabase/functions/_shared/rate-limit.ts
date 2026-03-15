import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_MAX_REQUESTS_PER_HOUR = 30;

/** Per-function rate limit overrides */
const FUNCTION_LIMITS: Record<string, number> = {
  "analyze-artifact": 120,
  "rework-artifact": 60,
  "canon-learning": 600,
  "canon-learning-read": 2400,
  "canon-learning-write": 240,
  "purple-learning": 600,
  "purple-learning-read": 2400,
  "purple-learning-write": 240,
  "canon-ingestion-agent": 300,
  "canon-promotion-pipeline": 120,
  "canon-review-engine": 120,
  "canon-candidate-review-engine": 120,
  "canon-evolution-engine": 120,
  "canon-evolution-control": 120,
  "deep-repo-absorber-engine": 90,
  "source-discovery-agent": 60,
  "skill-extraction-engine": 600,
  "skill-extraction-engine-read": 2400,
  "skill-extraction-engine-write": 240,
  "nervous-system-engine": 600,
  "nervous-system-engine-read": 2400,
  "nervous-system-engine-write": 240,
};

/**
 * Check and record rate limit for a user+function combo.
 * Returns { allowed: boolean, remaining: number }
 */
export async function checkRateLimit(
  userId: string,
  functionName: string
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const maxRequests = FUNCTION_LIMITS[functionName] || DEFAULT_MAX_REQUESTS_PER_HOUR;

  // Count recent requests
  const { count, error } = await supabase
    .from("ai_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("function_name", functionName)
    .gte("requested_at", oneHourAgo);

  if (error) {
    console.error("Rate limit check error:", error);
    return { allowed: true, remaining: maxRequests };
  }

  const used = count || 0;
  const remaining = Math.max(0, maxRequests - used);

  if (used >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Record this request
  await supabase.from("ai_rate_limits").insert({
    user_id: userId,
    function_name: functionName,
  });

  return { allowed: true, remaining: remaining - 1 };
}
