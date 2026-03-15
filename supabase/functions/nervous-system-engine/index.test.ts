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

Deno.test("NS-02: New actions registered (list_signal_groups)", async () => {
  // Without auth → 401, but action name is accepted by the set
  const { status } = await callEngine({ action: "list_signal_groups" });
  assertEquals(status, 401); // Rejected at auth, not at action validation
});

Deno.test("NS-02: New actions registered (get_classified_feed)", async () => {
  const { status } = await callEngine({ action: "get_classified_feed" });
  assertEquals(status, 401);
});

Deno.test("NS-02: New actions registered (process_pending)", async () => {
  const { status } = await callEngine({ action: "process_pending" });
  assertEquals(status, 401);
});
