import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { filterAgentSelectionRelevantSignals, aggregateAgentSelectionSignals, filterWeakAgentGroups } from "../_shared/agent-selection-tuning/agent-selection-tuning-aggregation.ts";
import { generateAgentSelectionTuningProposals, downgradeWeakProposals } from "../_shared/agent-selection-tuning/agent-selection-tuning-proposal-generator.ts";
import { validateReviewTransition } from "../_shared/agent-selection-tuning/agent-selection-tuning-proposal-types.ts";
import { routeProposals, routingSummary } from "../_shared/agent-selection-tuning/agent-selection-tuning-routing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Generate proposals from recent learning signals ──
    if (action === "generate") {
      const lookbackHours = body.lookback_hours || 24;
      const since = new Date(Date.now() - lookbackHours * 3600000).toISOString();

      const { data: signals, error: sigErr } = await supabase
        .from("learning_signals")
        .select("*")
        .eq("organization_id", organization_id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);

      if (sigErr) throw sigErr;
      if (!signals || signals.length === 0) {
        return new Response(JSON.stringify({ proposals: [], message: "No recent signals" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const relevant = filterAgentSelectionRelevantSignals(signals);
      const groups = aggregateAgentSelectionSignals(relevant);
      const { strong } = filterWeakAgentGroups(groups);
      let proposals = generateAgentSelectionTuningProposals(organization_id, strong);
      proposals = downgradeWeakProposals(proposals);
      const routed = routeProposals(proposals);

      if (routed.length > 0) {
        const { error: insErr } = await supabase.from("agent_selection_tuning_proposals").insert(
          routed.map(p => ({
            organization_id: p.organization_id,
            proposal_type: p.proposal_type,
            target_selection_scope: p.target_selection_scope,
            target_agent_id: p.target_agent_id,
            target_stage_scope: p.target_stage_scope,
            target_action_type_scope: p.target_action_type_scope,
            target_capability_scope: p.target_capability_scope,
            related_learning_signal_ids: p.related_learning_signal_ids,
            related_action_ids: p.related_action_ids,
            related_outcome_ids: p.related_outcome_ids,
            related_agent_decision_ids: p.related_agent_decision_ids,
            initiative_ids: p.initiative_ids,
            environment_scope: p.environment_scope,
            evidence_summary: p.evidence_summary,
            rationale: p.rationale,
            confidence: p.confidence,
            severity: p.severity,
            recommendation: p.recommendation,
            review_status: p.review_status,
            proposed_by_actor_type: p.proposed_by_actor_type,
            aggregation_key: p.aggregation_key,
            aggregation_count: p.aggregation_count,
            metadata: p.metadata,
          }))
        );
        if (insErr) throw insErr;
      }

      return new Response(JSON.stringify({
        proposals_generated: routed.length,
        signals_processed: signals.length,
        agent_selection_relevant: relevant.length,
        routing_summary: routingSummary(proposals),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── List proposals ──
    if (action === "list") {
      let query = supabase
        .from("agent_selection_tuning_proposals")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(body.limit || 100);

      if (body.review_status) query = query.eq("review_status", body.review_status);
      if (body.proposal_type) query = query.eq("proposal_type", body.proposal_type);
      if (body.severity) query = query.eq("severity", body.severity);
      if (body.target_agent_id) query = query.eq("target_agent_id", body.target_agent_id);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ proposals: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Transition review status ──
    if (action === "transition") {
      const { proposal_id, new_status } = body;
      if (!proposal_id || !new_status) {
        return new Response(JSON.stringify({ error: "proposal_id and new_status required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing, error: fetchErr } = await supabase
        .from("agent_selection_tuning_proposals")
        .select("review_status")
        .eq("id", proposal_id)
        .single();

      if (fetchErr || !existing) {
        return new Response(JSON.stringify({ error: "Proposal not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = validateReviewTransition(existing.review_status, new_status);
      if (!result.allowed) {
        return new Response(JSON.stringify({ error: result.reason }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: upErr } = await supabase
        .from("agent_selection_tuning_proposals")
        .update({ review_status: new_status, updated_at: new Date().toISOString() })
        .eq("id", proposal_id);

      if (upErr) throw upErr;

      return new Response(JSON.stringify({ success: true, transition: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Summary ──
    if (action === "summary") {
      const { data, error } = await supabase
        .from("agent_selection_tuning_proposals")
        .select("proposal_type, review_status, severity, confidence, target_agent_id, target_stage_scope")
        .eq("organization_id", organization_id);

      if (error) throw error;

      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      const byAgent: Record<string, number> = {};
      for (const p of data || []) {
        byType[p.proposal_type] = (byType[p.proposal_type] || 0) + 1;
        byStatus[p.review_status] = (byStatus[p.review_status] || 0) + 1;
        bySeverity[p.severity] = (bySeverity[p.severity] || 0) + 1;
        if (p.target_agent_id) byAgent[p.target_agent_id] = (byAgent[p.target_agent_id] || 0) + 1;
      }

      return new Response(JSON.stringify({
        total: (data || []).length,
        by_type: byType,
        by_status: byStatus,
        by_severity: bySeverity,
        by_agent: byAgent,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
