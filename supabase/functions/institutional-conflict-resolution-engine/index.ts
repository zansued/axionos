import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, organization_id, ...params } = await req.json();

    switch (action) {
      case "overview": {
        const [conflicts, precedents, events] = await Promise.all([
          supabase.from("institutional_conflicts").select("id, conflict_type, severity, urgency, status").eq("organization_id", organization_id),
          supabase.from("conflict_precedents").select("id, conflict_type").eq("organization_id", organization_id),
          supabase.from("conflict_resolution_events").select("id, event_type").eq("organization_id", organization_id),
        ]);

        const c = conflicts.data || [];
        const statusDist: Record<string, number> = {};
        const typeDist: Record<string, number> = {};
        const sevDist: Record<string, number> = {};
        for (const item of c) {
          statusDist[item.status] = (statusDist[item.status] || 0) + 1;
          typeDist[item.conflict_type] = (typeDist[item.conflict_type] || 0) + 1;
          sevDist[item.severity] = (sevDist[item.severity] || 0) + 1;
        }

        return new Response(JSON.stringify({
          total_conflicts: c.length,
          open_conflicts: c.filter((x: any) => !["resolved", "archived"].includes(x.status)).length,
          status_distribution: statusDist,
          type_distribution: typeDist,
          severity_distribution: sevDist,
          total_precedents: (precedents.data || []).length,
          total_events: (events.data || []).length,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "detect": {
        // Auto-detect conflicts from doctrine evaluations and drift events
        const detectedConflicts: any[] = [];

        const { data: evals } = await supabase
          .from("doctrine_adaptation_evaluations")
          .select("*")
          .eq("organization_id", organization_id)
          .in("evaluation_result", ["conflicting", "blocked"])
          .order("created_at", { ascending: false })
          .limit(20);

        for (const e of evals || []) {
          // Check if conflict already exists
          const { data: existing } = await supabase
            .from("institutional_conflicts")
            .select("id")
            .eq("organization_id", organization_id)
            .eq("conflict_code", `doctrine_eval_${e.id}`)
            .limit(1);

          if ((existing || []).length === 0) {
            const { data: inserted } = await supabase.from("institutional_conflicts").insert({
              conflict_code: `doctrine_eval_${e.id}`,
              conflict_type: "doctrine",
              conflict_title: `Doctrine conflict: ${e.evaluation_result}`,
              conflict_summary: e.adaptation_summary || "Doctrine evaluation flagged as conflicting or blocked.",
              severity: e.evaluation_result === "blocked" ? "high" : "medium",
              urgency: Number(e.drift_risk_score) > 0.6 ? "high" : "normal",
              blast_radius: "local",
              involved_domains: ["doctrine_adaptation"],
              involved_subjects: [
                { type: "doctrine", id: e.doctrine_id },
                { type: "context_profile", id: e.context_profile_id },
              ],
              detected_by: "conflict_detector",
              organization_id,
            }).select();
            if (inserted) detectedConflicts.push(...inserted);
          }
        }

        return new Response(JSON.stringify({
          detected: detectedConflicts.length,
          conflicts: detectedConflicts,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "triage": {
        const { conflict_id, new_status } = params;
        const validStatuses = ["triaged", "under_review", "escalated"];
        if (!validStatuses.includes(new_status)) {
          return new Response(JSON.stringify({ error: "Invalid triage status" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        await supabase.from("institutional_conflicts").update({ status: new_status, updated_at: new Date().toISOString() }).eq("id", conflict_id);
        await supabase.from("conflict_resolution_events").insert({
          conflict_id,
          organization_id,
          event_type: "triage",
          actor_type: "operator",
          event_summary: `Conflict triaged to: ${new_status}`,
        });

        return new Response(JSON.stringify({ success: true, status: new_status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "analyze": {
        const { conflict_id } = params;

        const [conflictRes, evidenceRes, pathsRes, eventsRes] = await Promise.all([
          supabase.from("institutional_conflicts").select("*").eq("id", conflict_id).single(),
          supabase.from("conflict_evidence_records").select("*").eq("conflict_id", conflict_id),
          supabase.from("conflict_resolution_paths").select("*").eq("conflict_id", conflict_id),
          supabase.from("conflict_resolution_events").select("*").eq("conflict_id", conflict_id).order("created_at", { ascending: false }),
        ]);

        if (conflictRes.error) throw conflictRes.error;

        // Find precedents
        const { data: precedents } = await supabase
          .from("conflict_precedents")
          .select("*")
          .eq("organization_id", organization_id)
          .eq("conflict_type", conflictRes.data.conflict_type)
          .order("outcome_quality_score", { ascending: false })
          .limit(5);

        return new Response(JSON.stringify({
          conflict: conflictRes.data,
          evidence: evidenceRes.data || [],
          resolution_paths: pathsRes.data || [],
          events: eventsRes.data || [],
          precedents: precedents || [],
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "resolution_paths": {
        const { conflict_id } = params;

        const { data: conflict } = await supabase.from("institutional_conflicts").select("*").eq("id", conflict_id).single();
        if (!conflict) {
          return new Response(JSON.stringify({ error: "Conflict not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Generate paths
        const pathTemplates: Record<string, { summary: string; base: number }> = {
          mediation: { summary: "Facilitate dialogue between involved parties.", base: 0.8 },
          override: { summary: "Apply authoritative override from higher governance.", base: 0.5 },
          exception: { summary: "Grant bounded exception with review requirement.", base: 0.6 },
          deferment: { summary: "Defer pending additional evidence.", base: 0.4 },
          split_scope: { summary: "Split jurisdiction for each party.", base: 0.7 },
          escalation: { summary: "Escalate to institutional authority.", base: 0.3 },
          rollback: { summary: "Rollback to last known-good state.", base: 0.6 },
        };

        const paths = [];
        for (const [pathType, tmpl] of Object.entries(pathTemplates)) {
          if (pathType === "rollback" && conflict.severity === "low") continue;

          let score = tmpl.base;
          if (pathType === "mediation" && conflict.severity !== "critical") score += 0.1;
          if (pathType === "escalation" && conflict.severity === "critical") score += 0.3;
          score = Math.max(0, Math.min(1.0, score));

          paths.push({
            conflict_id,
            organization_id,
            path_type: pathType,
            path_summary: tmpl.summary,
            advisory_score: score,
            precedent_alignment_score: 0,
            risk_tradeoff_score: pathType === "override" ? 0.7 : pathType === "escalation" ? 0.5 : 0.2,
            recommended: false,
          });
        }

        paths.sort((a, b) => b.advisory_score - a.advisory_score);
        if (paths.length > 0) paths[0].recommended = true;

        // Store paths
        await supabase.from("conflict_resolution_paths").insert(paths);

        return new Response(JSON.stringify(paths), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "resolve": {
        const { conflict_id, resolution_summary, resolution_path_type } = params;

        await supabase.from("institutional_conflicts").update({ status: "resolved", updated_at: new Date().toISOString() }).eq("id", conflict_id);
        await supabase.from("conflict_resolution_events").insert({
          conflict_id,
          organization_id,
          event_type: "resolution",
          actor_type: "operator",
          event_summary: resolution_summary || `Resolved via ${resolution_path_type || "manual decision"}`,
          event_payload: { resolution_path_type },
        });

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "escalate": {
        const { conflict_id, escalation_reason } = params;

        await supabase.from("institutional_conflicts").update({ status: "escalated", updated_at: new Date().toISOString() }).eq("id", conflict_id);
        await supabase.from("conflict_resolution_events").insert({
          conflict_id,
          organization_id,
          event_type: "escalation",
          actor_type: "system",
          event_summary: escalation_reason || "Escalated due to severity or unresolved status.",
        });

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "explain": {
        const { conflict_id } = params;

        const [conflictRes, pathsRes] = await Promise.all([
          supabase.from("institutional_conflicts").select("*").eq("id", conflict_id).single(),
          supabase.from("conflict_resolution_paths").select("*").eq("conflict_id", conflict_id),
        ]);

        const conflict = conflictRes.data;
        if (!conflict) {
          return new Response(JSON.stringify({ error: "Conflict not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const paths = pathsRes.data || [];
        const recommended = paths.find((p: any) => p.recommended);

        const { data: precedents } = await supabase
          .from("conflict_precedents")
          .select("id")
          .eq("organization_id", organization_id)
          .eq("conflict_type", conflict.conflict_type);

        const explanation = {
          why_is_conflict: `Classified as "${conflict.conflict_type}" conflict: ${conflict.conflict_summary}`,
          what_collides: `Subjects: ${JSON.stringify(conflict.involved_subjects)}. Domains: ${JSON.stringify(conflict.involved_domains)}.`,
          what_is_at_risk: `Severity: ${conflict.severity}. Urgency: ${conflict.urgency}. Blast radius: ${conflict.blast_radius}.`,
          possible_paths: `${paths.length} path(s). Recommended: ${recommended?.path_type || "none"} — ${recommended?.path_summary || "N/A"}.`,
          precedent_count: (precedents || []).length,
          escalation_needed: conflict.severity === "critical" || conflict.urgency === "critical",
        };

        return new Response(JSON.stringify({ conflict, explanation, paths }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "precedents": {
        const { data, error } = await supabase
          .from("conflict_precedents")
          .select("*")
          .eq("organization_id", organization_id)
          .order("outcome_quality_score", { ascending: false })
          .limit(20);
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("institutional-conflict-resolution-engine error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
