import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, organization_id, boundary_id, signal_type, source_scope, target_scope, payload } = await req.json();

    // ── overview ──
    if (action === "overview") {
      const [boundaries, transfers, violations, patterns] = await Promise.all([
        supabase.from("federated_boundaries").select("*").eq("organization_id", organization_id),
        supabase.from("federated_transfer_events").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
        supabase.from("boundary_violation_events").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(20),
        supabase.from("federated_shared_patterns").select("*").eq("organization_id", organization_id).limit(50),
      ]);

      const transferData = transfers.data || [];
      const stats = {
        total_boundaries: (boundaries.data || []).length,
        total_transfers: transferData.length,
        allowed: transferData.filter((t: any) => t.transfer_decision === "allowed").length,
        denied: transferData.filter((t: any) => t.transfer_decision === "denied").length,
        transformed: transferData.filter((t: any) => t.transfer_decision === "transformed").length,
        escalated: transferData.filter((t: any) => t.transfer_decision === "escalated").length,
        total_violations: (violations.data || []).length,
        total_patterns: (patterns.data || []).length,
      };

      return new Response(JSON.stringify({ stats, boundaries: boundaries.data, recent_transfers: transferData.slice(0, 10), recent_violations: (violations.data || []).slice(0, 5) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── boundaries ──
    if (action === "boundaries") {
      const { data } = await supabase.from("federated_boundaries").select("*").eq("organization_id", organization_id);
      return new Response(JSON.stringify({ boundaries: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── policies ──
    if (action === "policies") {
      let q = supabase.from("boundary_transfer_policies").select("*").eq("organization_id", organization_id);
      if (boundary_id) q = q.eq("boundary_id", boundary_id);
      const { data } = await q;
      return new Response(JSON.stringify({ policies: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── evaluate_transfer ──
    if (action === "evaluate_transfer") {
      // Find matching boundary
      const { data: boundaryData } = await supabase.from("federated_boundaries").select("*").eq("organization_id", organization_id).eq("source_scope", source_scope).eq("target_scope", target_scope).eq("boundary_status", "active").limit(1);

      if (!boundaryData || boundaryData.length === 0) {
        return new Response(JSON.stringify({ decision: "denied", reason: "No active boundary found between the specified scopes. Default: deny." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const boundary = boundaryData[0];
      const { data: policies } = await supabase.from("boundary_transfer_policies").select("*").eq("boundary_id", boundary.id).eq("active", true);

      // Evaluate
      const isHard = boundary.boundary_type === "hard";
      const matchingPolicy = (policies || []).find((p: any) => p.signal_type === signal_type);

      let decision = "denied";
      let transformation_type = null;
      let reason = "";

      if (isHard) {
        decision = "denied";
        reason = `Hard boundary "${boundary.boundary_code}" blocks all transfers.`;
      } else if (!matchingPolicy) {
        decision = boundary.boundary_type === "advisory" ? "escalated" : "denied";
        reason = `No explicit policy for signal "${signal_type}" on boundary "${boundary.boundary_code}". Default: ${decision}.`;
      } else {
        const mode = matchingPolicy.transfer_mode;
        if (mode === "deny") { decision = "denied"; reason = "Policy denies this transfer."; }
        else if (mode === "allow") { decision = "allowed"; reason = "Policy allows this transfer."; }
        else if (mode === "allow_aggregated") { decision = "transformed"; transformation_type = "aggregation"; reason = "Policy requires aggregation."; }
        else if (mode === "allow_anonymized") { decision = "transformed"; transformation_type = "anonymization"; reason = "Policy requires anonymization."; }
        else if (mode === "allow_with_review") { decision = "escalated"; reason = "Policy requires human review."; }
      }

      // Record event
      await supabase.from("federated_transfer_events").insert({
        boundary_id: boundary.id,
        source_entity: source_scope,
        target_entity: target_scope,
        signal_type: signal_type || "unknown",
        transfer_decision: decision,
        transformation_type,
        reason_summary: reason,
        evidence: payload || {},
        organization_id,
      });

      return new Response(JSON.stringify({ decision, transformation_type, reason, boundary_code: boundary.boundary_code, boundary_type: boundary.boundary_type }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── shared_patterns ──
    if (action === "shared_patterns") {
      const { data } = await supabase.from("federated_shared_patterns").select("*").eq("organization_id", organization_id);
      return new Response(JSON.stringify({ patterns: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── violations ──
    if (action === "violations") {
      const { data } = await supabase.from("boundary_violation_events").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      return new Response(JSON.stringify({ violations: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── recommendations ──
    if (action === "recommendations") {
      const [{ data: boundaries }, { data: violations }] = await Promise.all([
        supabase.from("federated_boundaries").select("*").eq("organization_id", organization_id),
        supabase.from("boundary_violation_events").select("*").eq("organization_id", organization_id).is("resolved_at", null),
      ]);

      const recs: any[] = [];
      if ((violations || []).length > 3) {
        recs.push({ type: "warning", title: "High violation count", description: `${(violations || []).length} unresolved boundary violations require attention.`, priority: "high" });
      }
      const hardBoundaries = (boundaries || []).filter((b: any) => b.boundary_type === "hard");
      if (hardBoundaries.length === 0) {
        recs.push({ type: "advisory", title: "No hard boundaries defined", description: "Consider defining hard boundaries for critical isolation requirements.", priority: "medium" });
      }
      if (recs.length === 0) {
        recs.push({ type: "info", title: "Federation health is nominal", description: "No immediate recommendations. Continue monitoring transfer patterns.", priority: "low" });
      }

      return new Response(JSON.stringify({ recommendations: recs }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── explain ──
    if (action === "explain" && boundary_id) {
      const [{ data: boundary }, { data: policies }, { data: transfers }, { data: violations }] = await Promise.all([
        supabase.from("federated_boundaries").select("*").eq("id", boundary_id).single(),
        supabase.from("boundary_transfer_policies").select("*").eq("boundary_id", boundary_id),
        supabase.from("federated_transfer_events").select("*").eq("boundary_id", boundary_id).order("created_at", { ascending: false }).limit(10),
        supabase.from("boundary_violation_events").select("*").eq("boundary_id", boundary_id).order("created_at", { ascending: false }).limit(5),
      ]);

      return new Response(JSON.stringify({ boundary, policies, recent_transfers: transfers, recent_violations: violations }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
