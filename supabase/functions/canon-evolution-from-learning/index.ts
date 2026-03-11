import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateProposalsFromSignals } from "../_shared/canon-evolution/canon-evolution-proposal-generator.ts";
import { aggregateSignals, filterWeakGroups } from "../_shared/canon-evolution/canon-evolution-aggregation.ts";
import { routeProposal, summarizeProposals } from "../_shared/canon-evolution/canon-evolution-routing.ts";
import { validateReviewTransition, getAvailableReviewTransitions } from "../_shared/canon-evolution/canon-evolution-proposal-types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, organizationId, ...params } = await req.json();
    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organizationId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = (d: unknown, s = 200) =>
      new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    switch (action) {
      // ── Generate proposals from learning signals ──
      case "generate_proposals": {
        // Fetch recent learning signals for the org
        const { data: signals, error: sigErr } = await supabase
          .from("learning_signals")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(500);
        if (sigErr) throw sigErr;

        if (!signals || signals.length === 0) {
          return json({ proposals: [], message: "No learning signals available", skipped_rules: [] });
        }

        // Aggregate signals
        const groups = aggregateSignals(signals);
        const { strong } = filterWeakGroups(groups, 1, 0.2);

        // Flatten strong signals for proposal generation
        const strongSignals = strong.flatMap(g => g.signals);

        // Generate proposals
        const result = generateProposalsFromSignals({
          organization_id: organizationId,
          signals: strongSignals,
        });

        // Store generated proposals
        const stored = [];
        for (const proposal of result.proposals) {
          const routing = routeProposal(proposal);

          const { data, error } = await supabase
            .from("canon_learning_evolution_proposals")
            .insert({
              organization_id: organizationId,
              proposal_type: proposal.proposal_type,
              target_type: proposal.target_type,
              target_id: proposal.target_id,
              related_learning_signal_ids: proposal.related_learning_signal_ids,
              related_canon_entry_ids: proposal.related_canon_entry_ids,
              related_pattern_ids: proposal.related_pattern_ids,
              initiative_ids: proposal.initiative_ids,
              stage_scope: proposal.stage_scope,
              evidence_summary: proposal.evidence_summary,
              rationale: proposal.rationale,
              confidence: proposal.confidence,
              severity: proposal.severity,
              recommendation: proposal.recommendation,
              review_status: "proposed",
              proposed_by_actor_type: proposal.proposed_by_actor_type,
              aggregation_key: proposal.aggregation_key,
              aggregation_count: proposal.aggregation_count,
              routing_target: routing.target,
              routing_priority: routing.priority,
              metadata: proposal.metadata,
            })
            .select()
            .single();

          if (!error && data) stored.push(data);
        }

        return json({
          proposals_generated: stored.length,
          proposals: stored,
          skipped_rules: result.skipped_rules,
          signal_count: result.signal_count,
        });
      }

      // ── List proposals ──
      case "list_proposals": {
        let query = supabase
          .from("canon_learning_evolution_proposals")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (params.review_status) query = query.eq("review_status", params.review_status);
        if (params.proposal_type) query = query.eq("proposal_type", params.proposal_type);
        if (params.severity) query = query.eq("severity", params.severity);

        const { data, error } = await query.limit(200);
        if (error) throw error;

        return json({ proposals: data });
      }

      // ── Get proposal detail ──
      case "get_proposal": {
        const { proposalId } = params;
        if (!proposalId) return json({ error: "proposalId required" }, 400);

        const { data, error } = await supabase
          .from("canon_learning_evolution_proposals")
          .select("*")
          .eq("id", proposalId)
          .eq("organization_id", organizationId)
          .single();
        if (error) throw error;
        if (!data) return json({ error: "Proposal not found" }, 404);

        // Fetch linked learning signals if available
        let linkedSignals: any[] = [];
        if (data.related_learning_signal_ids?.length > 0) {
          const { data: sigs } = await supabase
            .from("learning_signals")
            .select("*")
            .in("id", data.related_learning_signal_ids)
            .limit(50);
          linkedSignals = sigs || [];
        }

        return json({ proposal: data, linked_signals: linkedSignals });
      }

      // ── Transition review status ──
      case "transition_status": {
        const { proposalId, target_status, notes } = params;
        if (!proposalId || !target_status) return json({ error: "proposalId and target_status required" }, 400);

        const { data: current } = await supabase
          .from("canon_learning_evolution_proposals")
          .select("review_status")
          .eq("id", proposalId)
          .eq("organization_id", organizationId)
          .single();
        if (!current) return json({ error: "Proposal not found" }, 404);

        const transition = validateReviewTransition(current.review_status as any, target_status);
        if (!transition.allowed) return json({ error: transition.reason }, 400);

        const updateFields: Record<string, unknown> = {
          review_status: target_status,
          updated_at: new Date().toISOString(),
        };
        if (notes) updateFields.reviewer_notes = notes;
        if (target_status === "accepted" || target_status === "rejected") {
          updateFields.reviewed_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from("canon_learning_evolution_proposals")
          .update(updateFields)
          .eq("id", proposalId);
        if (error) throw error;

        return json({
          status: target_status,
          available_transitions: getAvailableReviewTransitions(target_status),
        });
      }

      // ── Get summary statistics ──
      case "get_summary": {
        const { data, error } = await supabase
          .from("canon_learning_evolution_proposals")
          .select("*")
          .eq("organization_id", organizationId);
        if (error) throw error;

        const summary = summarizeProposals(data || []);
        return json({ summary });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("canon-evolution-from-learning error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
