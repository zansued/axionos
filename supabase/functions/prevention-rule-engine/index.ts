import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Prevention Rule Engine — AxionOS Sprint 8
 *
 * Promotes high-confidence prevention_rule_candidates into active prevention rules.
 * Also supports listing and toggling active rules.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action = "promote", candidate_id, rule_id, organization_id } = body;

    if (action === "promote") {
      // Promote a candidate into an active rule
      if (!candidate_id) {
        return new Response(JSON.stringify({ error: "candidate_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: candidate, error: candErr } = await serviceClient
        .from("prevention_rule_candidates")
        .select("*")
        .eq("id", candidate_id)
        .single();

      if (candErr || !candidate) {
        return new Response(JSON.stringify({ error: "Candidate not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build trigger conditions from the candidate context
      const triggerConditions = [
        { field: "error_category", operator: "contains", value: candidate.description },
      ];

      const { data: rule, error: ruleErr } = await serviceClient
        .from("active_prevention_rules")
        .insert({
          pattern_id: candidate.pattern_id,
          organization_id: candidate.organization_id,
          rule_type: candidate.rule_type || "validation_rule",
          description: candidate.description,
          trigger_conditions: triggerConditions,
          pipeline_stage: "*",
          action_type: candidate.rule_type === "stage_warning" ? "warn" : "add_validation",
          action_config: { proposed_action: candidate.proposed_action, expected_impact: candidate.expected_impact },
          confidence_score: candidate.confidence_score,
          enabled: true,
          source_candidate_id: candidate_id,
        })
        .select()
        .single();

      if (ruleErr) {
        return new Response(JSON.stringify({ error: ruleErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ rule_created: true, rule_id: rule.id, rule }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "toggle") {
      // Enable/disable a rule
      if (!rule_id) {
        return new Response(JSON.stringify({ error: "rule_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await serviceClient
        .from("active_prevention_rules")
        .select("enabled")
        .eq("id", rule_id)
        .single();

      const { error: togErr } = await serviceClient
        .from("active_prevention_rules")
        .update({ enabled: !existing?.enabled, updated_at: new Date().toISOString() })
        .eq("id", rule_id);

      if (togErr) {
        return new Response(JSON.stringify({ error: togErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ toggled: true, enabled: !existing?.enabled }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "list") {
      // List active rules
      if (!organization_id) {
        return new Response(JSON.stringify({ error: "organization_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: rules } = await serviceClient
        .from("active_prevention_rules")
        .select("*")
        .eq("organization_id", organization_id)
        .order("confidence_score", { ascending: false });

      return new Response(JSON.stringify({ rules: rules || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "auto_promote") {
      // Auto-promote high-confidence candidates
      if (!organization_id) {
        return new Response(JSON.stringify({ error: "organization_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: candidates } = await serviceClient
        .from("prevention_rule_candidates")
        .select("*")
        .eq("organization_id", organization_id)
        .gte("confidence_score", 0.75)
        .order("confidence_score", { ascending: false })
        .limit(20);

      // Check which already have rules
      const { data: existingRules } = await serviceClient
        .from("active_prevention_rules")
        .select("source_candidate_id")
        .eq("organization_id", organization_id);

      const existingCandidateIds = new Set((existingRules || []).map((r: any) => r.source_candidate_id));
      const newCandidates = (candidates || []).filter((c: any) => !existingCandidateIds.has(c.id));

      let promoted = 0;
      for (const candidate of newCandidates.slice(0, 10)) {
        const { error } = await serviceClient
          .from("active_prevention_rules")
          .insert({
            pattern_id: candidate.pattern_id,
            organization_id: candidate.organization_id,
            rule_type: candidate.rule_type || "validation_rule",
            description: candidate.description,
            trigger_conditions: [
              { field: "error_category", operator: "contains", value: candidate.description },
            ],
            pipeline_stage: "*",
            action_type: candidate.rule_type === "stage_warning" ? "warn" : "add_validation",
            action_config: { proposed_action: candidate.proposed_action, expected_impact: candidate.expected_impact },
            confidence_score: candidate.confidence_score,
            enabled: true,
            source_candidate_id: candidate.id,
          });

        if (!error) promoted++;
      }

      return new Response(JSON.stringify({
        auto_promoted: promoted,
        candidates_evaluated: newCandidates.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("Prevention rule engine error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
