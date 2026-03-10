import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_STAGES = ["discovery", "architecture", "engineering", "validation", "repair", "publish"];
const VALID_REUSE_TYPES = ["recommended_strategy", "preventive_rule", "execution_guideline", "repair_routing_hint"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, organization_id: orgId } = body;

    if (!orgId) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── apply_canon_guidance ─── */
    if (action === "apply_canon_guidance") {
      // Scan active canon records and create reuse rules for each pipeline stage
      const { data: activeRecords, error: arErr } = await supabase
        .from("canon_learning_records")
        .select("id, confidence_score, candidate_id, learning_candidates(candidate_type, pattern_signature, recommended_action)")
        .eq("organization_id", orgId)
        .eq("promotion_stage", "active");

      if (arErr) throw arErr;
      if (!activeRecords || activeRecords.length === 0) {
        return new Response(JSON.stringify({ message: "No active canon records to inject", rules_created: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let created = 0;

      for (const rec of activeRecords) {
        const candidate = rec.learning_candidates as any;
        if (!candidate) continue;

        // Map candidate_type to affected stages and reuse_type
        const mappings = mapCandidateToStages(candidate.candidate_type);

        for (const m of mappings) {
          // Check if rule already exists
          const { data: existing } = await supabase
            .from("canon_reuse_registry")
            .select("id")
            .eq("organization_id", orgId)
            .eq("canon_record_id", rec.id)
            .eq("affected_stage", m.stage)
            .limit(1);

          if (existing && existing.length > 0) continue;

          await supabase.from("canon_reuse_registry").insert({
            organization_id: orgId,
            canon_record_id: rec.id,
            affected_stage: m.stage,
            reuse_type: m.reuse_type,
            activation_status: "advisory",
          });
          created++;
        }
      }

      return new Response(JSON.stringify({ message: `Canon guidance applied. ${created} new reuse rules created.`, rules_created: created }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── list_reuse_rules ─── */
    if (action === "list_reuse_rules") {
      const { stage_filter, status_filter } = body;

      let query = supabase
        .from("canon_reuse_registry")
        .select("*, canon_learning_records(id, confidence_score, promotion_stage, learning_candidates(pattern_signature, candidate_type, recommended_action))")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (stage_filter) query = query.eq("affected_stage", stage_filter);
      if (status_filter) query = query.eq("activation_status", status_filter);

      const { data, error } = await query.limit(200);
      if (error) throw error;

      return new Response(JSON.stringify({ rules: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── reuse_metrics ─── */
    if (action === "reuse_metrics") {
      const { data: rules, error } = await supabase
        .from("canon_reuse_registry")
        .select("affected_stage, reuse_type, activation_status, times_applied")
        .eq("organization_id", orgId);

      if (error) throw error;

      const byStage: Record<string, number> = {};
      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let totalApplications = 0;

      for (const r of (rules || [])) {
        byStage[r.affected_stage] = (byStage[r.affected_stage] || 0) + 1;
        byType[r.reuse_type] = (byType[r.reuse_type] || 0) + 1;
        byStatus[r.activation_status] = (byStatus[r.activation_status] || 0) + 1;
        totalApplications += r.times_applied || 0;
      }

      return new Response(JSON.stringify({
        total_rules: (rules || []).length,
        total_applications: totalApplications,
        by_stage: byStage,
        by_type: byType,
        by_status: byStatus,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── activate_rule / deactivate_rule ─── */
    if (action === "activate_rule" || action === "deactivate_rule") {
      const { rule_id } = body;
      if (!rule_id) {
        return new Response(JSON.stringify({ error: "rule_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newStatus = action === "activate_rule" ? "active" : "advisory";
      const { data: updated, error: uErr } = await supabase
        .from("canon_reuse_registry")
        .update({ activation_status: newStatus })
        .eq("id", rule_id)
        .eq("organization_id", orgId)
        .select()
        .single();

      if (uErr) throw uErr;

      return new Response(JSON.stringify({ rule: updated, message: `Rule ${newStatus}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ─── Mapping logic ─── */

function mapCandidateToStages(candidateType: string): Array<{ stage: string; reuse_type: string }> {
  switch (candidateType) {
    case "repair_strategy":
      return [
        { stage: "repair", reuse_type: "repair_routing_hint" },
        { stage: "validation", reuse_type: "preventive_rule" },
      ];
    case "execution_pattern":
      return [
        { stage: "engineering", reuse_type: "execution_guideline" },
        { stage: "architecture", reuse_type: "recommended_strategy" },
      ];
    case "regression_prevention":
      return [
        { stage: "validation", reuse_type: "preventive_rule" },
        { stage: "publish", reuse_type: "preventive_rule" },
      ];
    case "architecture_guideline":
      return [
        { stage: "discovery", reuse_type: "recommended_strategy" },
        { stage: "architecture", reuse_type: "execution_guideline" },
      ];
    case "validation_rule":
      return [
        { stage: "validation", reuse_type: "preventive_rule" },
      ];
    default:
      return [
        { stage: "engineering", reuse_type: "execution_guideline" },
      ];
  }
}
