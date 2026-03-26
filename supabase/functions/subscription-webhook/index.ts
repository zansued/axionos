import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Subscription Webhook — processes Stripe webhook events
 * for subscription lifecycle management.
 * 
 * Handles: customer.subscription.*, invoice.payment_*
 * Uses correct Stripe signature validation (t=timestamp,v1=hmac format).
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const payload = await req.text();
    const signatureHeader = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    // Validate signature
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return jsonError("Webhook secret not configured", 500);
    }
    if (!signatureHeader) {
      return jsonError("Missing stripe-signature header", 400);
    }

    const isValid = await verifyStripeSignature(payload, signatureHeader, webhookSecret);
    if (!isValid) {
      return jsonError("Invalid signature", 400);
    }

    // Parse event
    const event = JSON.parse(payload);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let result: { action: string; success: boolean };

    if (event.type.startsWith("customer.subscription")) {
      result = await handleSubscriptionEvent(event, supabase);
    } else if (event.type.startsWith("invoice.payment")) {
      result = await handleInvoiceEvent(event, supabase);
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Event type not handled",
          event_id: event.id,
          event_type: event.type,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook processed",
        event_id: event.id,
        event_type: event.type,
        action: result.action,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return jsonError(`Internal error: ${(error as Error).message}`, 500);
  }
});

// ─── Stripe Signature Verification ───
// Stripe sends: t=timestamp,v1=hex_hmac_sha256
async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  try {
    const elements = header.split(",");
    const timestamp = elements.find((e) => e.startsWith("t="))?.slice(2);
    const signature = elements.find((e) => e.startsWith("v1="))?.slice(3);

    if (!timestamp || !signature) return false;

    // Check timestamp tolerance (prevent replay attacks)
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) return false;
    const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
    if (age > toleranceSeconds) return false;

    // Compute expected signature: HMAC-SHA256(secret, "timestamp.payload")
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signedPayload = `${timestamp}.${payload}`;
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));

    // Convert to hex
    const expectedSig = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    return timingSafeEqual(expectedSig, signature);
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ─── Event Handlers ───

async function handleSubscriptionEvent(
  event: any,
  supabase: ReturnType<typeof createClient>,
): Promise<{ action: string; success: boolean }> {
  const subscription = event.data.object;
  const customerId = subscription.customer;

  const actionMap: Record<string, string> = {
    "customer.subscription.created": "created",
    "customer.subscription.updated": "updated",
    "customer.subscription.deleted": "deleted",
  };
  const action = actionMap[event.type] || "unknown";

  const success = await updateSubscriptionStatus(supabase, customerId, subscription.status);
  return { action: success ? `${action}_success` : `${action}_failed`, success };
}

async function handleInvoiceEvent(
  event: any,
  supabase: ReturnType<typeof createClient>,
): Promise<{ action: string; success: boolean }> {
  const invoice = event.data.object;
  const customerId = invoice.customer;

  const isSuccess = event.type === "invoice.payment_succeeded";
  const status = isSuccess ? "active" : "past_due";
  const action = isSuccess ? "payment_succeeded" : "payment_failed";

  const success = await updateSubscriptionStatus(supabase, customerId, status);
  return { action: success ? `${action}_processed` : `${action}_failed`, success };
}

async function updateSubscriptionStatus(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
  status: string,
): Promise<boolean> {
  try {
    // Look up user by stripe_customer_id in profiles table
    const { data: profile, error: findErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (findErr || !profile) {
      console.error("Profile not found for customer:", customerId, findErr?.message);
      return false;
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        subscription_status: status,
        subscription_active: status === "active" || status === "trialing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (updateErr) {
      console.error("Update failed:", updateErr.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error("updateSubscriptionStatus error:", error);
    return false;
  }
}

function jsonError(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
