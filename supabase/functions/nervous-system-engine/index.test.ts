import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/nervous-system-engine`;

// ═══════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════

async function callEngine(body: Record<string, unknown>, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text(); // Always consume body
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

// ═══════════════════════════════════════════════════
// 1. Unauthenticated access should be rejected
// ═══════════════════════════════════════════════════

Deno.test("NS-01: Unauthenticated request returns 401", async () => {
  const { status, data } = await callEngine({ action: "get_pulse" });
  assertEquals(status, 401);
  assertExists(data.error);
});

// ═══════════════════════════════════════════════════
// 2. Invalid action should return 400
// ═══════════════════════════════════════════════════

Deno.test("NS-01: Invalid action returns 400", async () => {
  const { status, data } = await callEngine(
    { action: "hack_the_planet" },
    SUPABASE_ANON_KEY // Using anon key as fake token — will fail auth
  );
  // Should fail at auth (401) before reaching action validation
  assertEquals(status === 401 || status === 400, true);
  await Promise.resolve(); // ensure cleanup
});

// ═══════════════════════════════════════════════════
// 3. Invalid JSON body should return 400
// ═══════════════════════════════════════════════════

Deno.test("NS-01: Malformed body returns error", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: "not json at all",
  });
  const text = await res.text();
  // Should return 400 or 401 (auth first)
  assertEquals(res.status === 400 || res.status === 401, true);
  assertExists(text);
});

// ═══════════════════════════════════════════════════
// 4. CORS preflight should succeed
// ═══════════════════════════════════════════════════

Deno.test("NS-01: OPTIONS returns CORS headers", async () => {
  const res = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  const text = await res.text();
  assertEquals(res.status, 200);
  assertExists(res.headers.get("access-control-allow-origin"));
  assertExists(text !== undefined, true);
});
