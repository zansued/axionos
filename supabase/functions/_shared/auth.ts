// Shared authentication helpers for edge functions

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse } from "./cors.ts";
import { checkRateLimit } from "./rate-limit.ts";

export interface AuthContext {
  user: { id: string; email?: string };
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
}

/**
 * Authenticate request and return clients.
 * Returns AuthContext on success, or a Response (error) on failure.
 */
export async function authenticate(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("Unauthorized", 401);
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    return errorResponse("Unauthorized", 401);
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  return { user, userClient, serviceClient };
}

/**
 * Authenticate + rate limit in one call.
 * Returns AuthContext on success, or a Response (error) on failure.
 */
export async function authenticateWithRateLimit(
  req: Request,
  functionName: string
): Promise<AuthContext | Response> {
  const result = await authenticate(req);
  if (result instanceof Response) return result;

  const { allowed } = await checkRateLimit(result.user.id, functionName);
  if (!allowed) {
    return errorResponse("Limite de requisições excedido. Tente novamente em breve.", 429);
  }

  return result;
}
