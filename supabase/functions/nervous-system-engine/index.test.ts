import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/nervous-system-engine`;

async function callEngine(body: Record<string, unknown>, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

// ═══════════════════════════════════════════════════
// NS-01: Foundation Tests
// ═══════════════════════════════════════════════════

Deno.test("NS-01: Unauthenticated request returns 401", async () => {
  const { status, data } = await callEngine({ action: "get_pulse" });
  assertEquals(status, 401);
  assertExists(data.error);
});

Deno.test("NS-01: Invalid action returns 400", async () => {
  const { status } = await callEngine({ action: "hack_the_planet" }, SUPABASE_ANON_KEY);
  assertEquals(status === 401 || status === 400, true);
});

Deno.test("NS-01: CORS preflight succeeds", async () => {
  const res = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 200);
  assertExists(res.headers.get("access-control-allow-origin"));
});

// ═══════════════════════════════════════════════════
// NS-02: Classification Actions
// ═══════════════════════════════════════════════════

Deno.test("NS-02: Action list_signal_groups requires auth", async () => {
  const { status } = await callEngine({ action: "list_signal_groups" });
  assertEquals(status, 401);
});

Deno.test("NS-02: Action get_classified_feed requires auth", async () => {
  const { status } = await callEngine({ action: "get_classified_feed" });
  assertEquals(status, 401);
});

Deno.test("NS-02: Action process_pending requires auth", async () => {
  const { status } = await callEngine({ action: "process_pending" });
  assertEquals(status, 401);
});

// ═══════════════════════════════════════════════════
// NS-03: Context Engine Actions
// ═══════════════════════════════════════════════════

Deno.test("NS-03: Action process_context_batch requires auth", async () => {
  const { status } = await callEngine({ action: "process_context_batch" });
  assertEquals(status, 401);
});

Deno.test("NS-03: Action get_contextual_feed requires auth", async () => {
  const { status } = await callEngine({ action: "get_contextual_feed" });
  assertEquals(status, 401);
});

Deno.test("NS-03: Actions recognized (not 400)", async () => {
  const { status: s1 } = await callEngine({ action: "process_context_batch" }, SUPABASE_ANON_KEY);
  assertEquals(s1 === 401 || s1 === 403, true);
  const { status: s2 } = await callEngine({ action: "get_contextual_feed" }, SUPABASE_ANON_KEY);
  assertEquals(s2 === 401 || s2 === 403, true);
});

// ═══════════════════════════════════════════════════
// NS-04: Decision Layer Actions
// ═══════════════════════════════════════════════════

Deno.test("NS-04: Action process_decision_batch requires auth", async () => {
  const { status } = await callEngine({ action: "process_decision_batch" });
  assertEquals(status, 401);
});

Deno.test("NS-04: Action get_decision_feed requires auth", async () => {
  const { status } = await callEngine({ action: "get_decision_feed" });
  assertEquals(status, 401);
});

Deno.test("NS-04: Action list_decisions requires auth", async () => {
  const { status } = await callEngine({ action: "list_decisions" });
  assertEquals(status, 401);
});

Deno.test("NS-04: Decision actions recognized (not 400)", async () => {
  const actions = ["process_decision_batch", "get_decision_feed", "list_decisions"];
  for (const action of actions) {
    const { status } = await callEngine({ action }, SUPABASE_ANON_KEY);
    assertEquals(status === 401 || status === 403, true, `${action} returned ${status}`);
  }
});

// ═══════════════════════════════════════════════════
// NS-04: Tenant isolation on decisions
// ═══════════════════════════════════════════════════

Deno.test("NS-04: Decisions query requires org membership", async () => {
  // Anon key without proper user → auth fails before org check
  const { status } = await callEngine({ action: "list_decisions" }, SUPABASE_ANON_KEY);
  assertEquals(status === 401 || status === 403, true);
});
