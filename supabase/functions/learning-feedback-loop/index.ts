// Learning Feedback Loop — AxionOS Sprint 155
// Edge function for generating, listing, and aggregating learning signals.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateLearningSignal } from "../_shared/learning/learning-signal-types.ts";
import {
  generateFromActionOutcome,
  generateFromCanonApplication,
  generateFromRecoveryOutcome,
  generateFromApprovalDecision,
} from "../_shared/learning/learning-signal-generator.ts";
import { persistSignals, querySignals, aggregateSignalSummary } from "../_shared/learning/learning-signal-storage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify org membership
    const { data: member } = await serviceClient
      .from("organization_members").select("role")
      .eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!member) {
      return new Response(JSON.stringify({ error: "Not a member of this organization" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = (d: unknown, s = 200) =>
      new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    switch (action) {
      // ── Generate from action outcome ──
      case "generate_from_action_outcome": {
        const signals = generateFromActionOutcome({ organization_id, ...body.evidence });
        const { data, error } = await persistSignals(serviceClient, signals);
        if (error) throw error;
        return json({ signals_generated: signals.length, signals: data });
      }

      // ── Generate from canon application ──
      case "generate_from_canon_application": {
        const signals = generateFromCanonApplication({ organization_id, ...body.evidence });
        const { data, error } = await persistSignals(serviceClient, signals);
        if (error) throw error;
        return json({ signals_generated: signals.length, signals: data });
      }

      // ── Generate from recovery outcome ──
      case "generate_from_recovery_outcome": {
        const signals = generateFromRecoveryOutcome({ organization_id, ...body.evidence });
        const { data, error } = await persistSignals(serviceClient, signals);
        if (error) throw error;
        return json({ signals_generated: signals.length, signals: data });
      }

      // ── Generate from approval decision ──
      case "generate_from_approval_decision": {
        const signals = generateFromApprovalDecision({ organization_id, ...body.evidence });
        const { data, error } = await persistSignals(serviceClient, signals);
        if (error) throw error;
        return json({ signals_generated: signals.length, signals: data });
      }

      // ── Submit raw signal ──
      case "submit_signal": {
        const validation = validateLearningSignal({ organization_id, ...body.signal });
        if (!validation.valid) return json({ error: "Validation failed", errors: validation.errors }, 400);
        const { data, error } = await persistSignals(serviceClient, [validation.signal]);
        if (error) throw error;
        return json({ signal: data?.[0] });
      }

      // ── List signals ──
      case "list_signals": {
        const { data, error } = await querySignals(serviceClient, organization_id, body.filters || {});
        if (error) throw error;
        return json({ signals: data });
      }

      // ── Aggregated summary ──
      case "summary": {
        const summary = await aggregateSignalSummary(serviceClient, organization_id);
        return json(summary);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
