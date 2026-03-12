/**
 * Sprint 166 — Approval Expiration & Governance Timers
 *
 * Scheduled function that expires overdue approval requests.
 * Propagates expiration to action_registry_entries and writes audit events.
 *
 * Risk-based TTL:
 *   critical → 4h
 *   high     → 12h
 *   medium   → 24h (default)
 *   low      → 48h
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const now = new Date().toISOString();

    // 1. Fetch all waiting_approval requests that have passed their expires_at
    const { data: overdueRequests, error: fetchError } = await supabase
      .from("action_approval_requests")
      .select("id, action_id, organization_id, risk_level, intent_id, trigger_type, stage, reason, expires_at, created_at")
      .eq("status", "waiting_approval")
      .not("expires_at", "is", null)
      .lt("expires_at", now)
      .limit(100);

    if (fetchError) {
      console.error("[ApprovalExpiration] Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!overdueRequests || overdueRequests.length === 0) {
      return new Response(
        JSON.stringify({ message: "No overdue approvals found.", expired_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[ApprovalExpiration] Found ${overdueRequests.length} overdue approval(s) to expire.`);

    let expiredCount = 0;
    const errors: string[] = [];

    for (const req of overdueRequests) {
      try {
        // 2. Expire the approval request
        const { error: updateApprovalError } = await supabase
          .from("action_approval_requests")
          .update({
            status: "expired",
            decided_at: now,
            decision_notes: `Auto-expired: approval window elapsed (expires_at: ${req.expires_at})`,
            updated_at: now,
          })
          .eq("id", req.id)
          .eq("status", "waiting_approval"); // guard against race conditions

        if (updateApprovalError) {
          errors.push(`approval ${req.id}: ${updateApprovalError.message}`);
          continue;
        }

        // 3. Propagate to action_registry_entries — mark as expired
        if (req.action_id) {
          const { error: updateActionError } = await supabase
            .from("action_registry_entries")
            .update({
              status: "expired",
              outcome_status: "expired",
              outcome_summary: `Approval expired without human decision. Risk level: ${req.risk_level}. Original reason: ${req.reason}`,
              updated_at: now,
            })
            .eq("action_id", req.action_id)
            .eq("organization_id", req.organization_id)
            .in("status", ["pending", "waiting_approval", "queued"]); // only expire non-terminal actions

          if (updateActionError) {
            console.warn(`[ApprovalExpiration] Action update warning for ${req.action_id}:`, updateActionError.message);
          }
        }

        // 4. Write audit event
        await supabase
          .from("action_audit_events")
          .insert({
            action_id: req.action_id,
            organization_id: req.organization_id,
            event_type: "approval_expired",
            previous_status: "waiting_approval",
            new_status: "expired",
            reason: `Approval TTL elapsed. expires_at=${req.expires_at}, risk_level=${req.risk_level}`,
            actor_type: "system",
            executor_type: "approval_expiration_cron",
          });

        expiredCount++;
      } catch (innerError) {
        const msg = innerError instanceof Error ? innerError.message : String(innerError);
        errors.push(`approval ${req.id}: ${msg}`);
        console.error(`[ApprovalExpiration] Error processing ${req.id}:`, msg);
      }
    }

    const result = {
      message: `Expired ${expiredCount} approval(s).`,
      expired_count: expiredCount,
      errors_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(`[ApprovalExpiration] Complete:`, result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[ApprovalExpiration] Critical error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
