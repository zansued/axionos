import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { filterReadinessRelevantSignals, aggregateReadinessSignals, filterWeakReadinessGroups } from "../_shared/readiness-tuning/readiness-tuning-aggregation.ts";
import { generateReadinessTuningProposals, downgradeWeakProposals } from "../_shared/readiness-tuning/readiness-tuning-proposal-generator.ts";
import { validateReviewTransition } from "../_shared/readiness-tuning/readiness-tuning-proposal-types.ts";
import { routeProposals, routingSummary } from "../_shared/readiness-tuning/readiness-tuning-routing.ts";

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

      const relevant = filterReadinessRelevantSignals(signals);
      const groups = aggregateReadinessSignals(relevant);
      const { strong } = filterWeakReadinessGroups(groups);
      let proposals = generateReadinessTuningProposals(organization_id, strong);
      proposals = downgradeWeakProposals(proposals);
      const routed = routeProposals(proposals);

      if (routed.length > 0) {
        const { error: insErr } = await supabase.from("readiness_tuning_proposals").insert(
          routed.map(p => ({
            organization_id: p.organization_id,
            proposal_type: p.proposal_type,
            target_stage_scope: p.target_stage_scope,
            target_readiness_check_id: p.target_readiness_check_id,
            target_threshold_id: p.target_threshold_id,
            target_rule_scope: p.target_rule_scope,
            related_learning_signal_ids: p.related_learning_signal_ids,
            related_readiness_result_ids: p.related_readiness_result_ids,
            related_action_ids: p.related_action_ids,
            related_outcome_ids: p.related_outcome_ids,
            related_recovery_hook_ids: p.related_recovery_hook_ids,
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
        readiness_relevant: relevant.length,
        routing_summary: routingSummary(proposals),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── List proposals ──
    if (action === "list") {
      let query = supabase
        .from("readiness_tuning_proposals")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(body.limit || 100);

      if (body.review_status) query = query.eq("review_status", body.review_status);
      if (body.proposal_type) query = query.eq("proposal_type", body.proposal_type);
      if (body.severity) query = query.eq("severity", body.severity);
      if (body.target_stage_scope) query = query.eq("target_stage_scope", body.target_stage_scope);

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
        .from("readiness_tuning_proposals")
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
        .from("readiness_tuning_proposals")
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
        .from("readiness_tuning_proposals")
        .select("proposal_type, review_status, severity, confidence, target_stage_scope, target_readiness_check_id")
        .eq("organization_id", organization_id);

      if (error) throw error;

      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      const byStage: Record<string, number> = {};
      for (const p of data || []) {
        byType[p.proposal_type] = (byType[p.proposal_type] || 0) + 1;
        byStatus[p.review_status] = (byStatus[p.review_status] || 0) + 1;
        bySeverity[p.severity] = (bySeverity[p.severity] || 0) + 1;
        if (p.target_stage_scope) byStage[p.target_stage_scope] = (byStage[p.target_stage_scope] || 0) + 1;
      }

      return new Response(JSON.stringify({
        total: (data || []).length,
        by_type: byType,
        by_status: byStatus,
        by_severity: bySeverity,
        by_stage: byStage,
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
