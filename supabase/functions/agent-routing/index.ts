import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "route_task": {
        const { organization_id, workspace_id, initiative_id, task_context, pipeline_stage, task_type, candidate_agents } = body;

        // Score each candidate based on suitability, risk, evidence
        const scored = (candidate_agents || []).map((c: any) => {
          const suitability = (c.capability_match || 0.5) * 0.4 + (c.prior_success_rate || 0.5) * 0.3 + (1 - (c.failure_rate || 0.1)) * 0.3;
          const risk = (c.failure_rate || 0.1) * 0.5 + (c.risk_factor || 0.2) * 0.5;
          return { ...c, suitability_score: Math.round(suitability * 1000) / 1000, risk_score: Math.round(risk * 1000) / 1000 };
        });

        scored.sort((a: any, b: any) => b.suitability_score - a.suitability_score);
        const chosen = scored[0] || null;
        const fallbacks = scored.slice(1, 4);

        const riskPosture = chosen ? (chosen.risk_score > 0.5 ? "high" : chosen.risk_score > 0.25 ? "moderate" : "low") : "unknown";

        // Insert routing decision
        const { data: decision, error: decError } = await supabase.from("agent_routing_decisions").insert({
          organization_id,
          workspace_id: workspace_id || null,
          initiative_id: initiative_id || null,
          task_context: task_context || {},
          pipeline_stage: pipeline_stage || "",
          task_type: task_type || "general",
          chosen_agent_id: chosen?.agent_id || null,
          chosen_capability: chosen?.capability_key || "",
          confidence_score: chosen?.suitability_score || 0,
          risk_posture: riskPosture,
          fallback_path: fallbacks.map((f: any) => ({ agent_id: f.agent_id, capability: f.capability_key, suitability: f.suitability_score })),
          routing_reason: chosen ? `Selected ${chosen.capability_key} with suitability ${chosen.suitability_score} (risk: ${chosen.risk_score})` : "No suitable candidate found",
          evidence_refs: chosen?.evidence_refs || [],
          policy_constraints_applied: body.policy_constraints || [],
          status: "decided",
        }).select().single();
        if (decError) throw decError;

        // Insert candidates
        for (const c of scored) {
          await supabase.from("agent_routing_candidates").insert({
            organization_id,
            decision_id: decision.id,
            agent_id: c.agent_id || null,
            capability_key: c.capability_key || "",
            suitability_score: c.suitability_score,
            risk_score: c.risk_score,
            rejection_reason: c === chosen ? null : `Outranked (suitability: ${c.suitability_score} < ${chosen?.suitability_score})`,
            selected: c === chosen,
            evidence_refs: c.evidence_refs || [],
          });
        }

        return new Response(JSON.stringify({ success: true, decision, chosen, fallbacks }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_routing_decisions": {
        const { organization_id, pipeline_stage, status: filterStatus, limit: queryLimit } = body;
        let query = supabase.from("agent_routing_decisions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(queryLimit || 50);
        if (pipeline_stage) query = query.eq("pipeline_stage", pipeline_stage);
        if (filterStatus) query = query.eq("status", filterStatus);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, decisions: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "routing_detail": {
        const { decision_id } = body;
        const { data: decision } = await supabase.from("agent_routing_decisions").select("*").eq("id", decision_id).single();
        const { data: candidates } = await supabase.from("agent_routing_candidates").select("*").eq("decision_id", decision_id).order("suitability_score", { ascending: false });
        const { data: outcomes } = await supabase.from("agent_routing_outcomes").select("*").eq("decision_id", decision_id);
        const { data: reviews } = await supabase.from("agent_routing_review_events").select("*").eq("decision_id", decision_id).order("created_at");
        return new Response(JSON.stringify({ success: true, decision, candidates, outcomes, reviews }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "explain_route": {
        const { decision_id } = body;
        const { data: decision } = await supabase.from("agent_routing_decisions").select("*").eq("id", decision_id).single();
        const { data: candidates } = await supabase.from("agent_routing_candidates").select("*").eq("decision_id", decision_id).order("suitability_score", { ascending: false });
        if (!decision) throw new Error("Decision not found");

        const explanation = {
          chosen: decision.chosen_capability,
          reason: decision.routing_reason,
          confidence: decision.confidence_score,
          risk: decision.risk_posture,
          alternatives_considered: (candidates || []).filter((c: any) => !c.selected).map((c: any) => ({
            capability: c.capability_key,
            suitability: c.suitability_score,
            rejection: c.rejection_reason,
          })),
          fallback_paths: decision.fallback_path,
          policy_constraints: decision.policy_constraints_applied,
          evidence: decision.evidence_refs,
          governance_note: "Routing decisions are advisory and auditable. No autonomous architecture mutation.",
        };
        return new Response(JSON.stringify({ success: true, explanation }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "compare_candidates": {
        const { decision_id } = body;
        const { data: candidates } = await supabase.from("agent_routing_candidates").select("*").eq("decision_id", decision_id).order("suitability_score", { ascending: false });
        return new Response(JSON.stringify({ success: true, candidates }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "mark_bad_route": {
        const { decision_id, organization_id, review_notes } = body;
        const { data, error } = await supabase.from("agent_routing_review_events").insert({
          organization_id,
          decision_id,
          reviewer_id: user.id,
          event_type: "bad_route_flag",
          review_notes: review_notes || "Flagged as bad routing decision by operator.",
        }).select().single();
        if (error) throw error;
        await supabase.from("agent_routing_decisions").update({ status: "flagged" }).eq("id", decision_id);
        return new Response(JSON.stringify({ success: true, review_event: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "recommend_fallback": {
        const { decision_id } = body;
        const { data: decision } = await supabase.from("agent_routing_decisions").select("*").eq("id", decision_id).single();
        if (!decision) throw new Error("Decision not found");
        const fallbacks = (decision.fallback_path as any[]) || [];
        const recommendation = fallbacks.length > 0
          ? { recommended: fallbacks[0], reason: `Next best candidate with suitability ${fallbacks[0].suitability}`, all_fallbacks: fallbacks }
          : { recommended: null, reason: "No fallback candidates available.", all_fallbacks: [] };
        return new Response(JSON.stringify({ success: true, recommendation }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("agent-routing error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
