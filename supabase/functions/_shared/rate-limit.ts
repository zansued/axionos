import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_MAX_REQUESTS_PER_HOUR = 30;

/** Per-function rate limit overrides */
const FUNCTION_LIMITS: Record<string, number> = {
  "analyze-artifact": 120,
  "rework-artifact": 60,
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

  // Count recent requests
  const { count, error } = await supabase
    .from("ai_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("function_name", functionName)
    .gte("requested_at", oneHourAgo);

  if (error) {
    console.error("Rate limit check error:", error);
    // Fail open — allow request if rate limit check fails
    return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR };
  }

  const used = count || 0;
  const remaining = Math.max(0, MAX_REQUESTS_PER_HOUR - used);

  if (used >= MAX_REQUESTS_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }

  // Record this request
  await supabase.from("ai_rate_limits").insert({
    user_id: userId,
    function_name: functionName,
  });

  return { allowed: true, remaining: remaining - 1 };
}
