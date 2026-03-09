import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, organization_id, ...params } = await req.json();
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sc = createClient(supabaseUrl, serviceKey);

    // Verify membership
    const { data: mem } = await sc.from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!mem) {
      return new Response(JSON.stringify({ error: "Not a member" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result: unknown;

    switch (action) {
      case "overview": {
        const [constRes, domRes, rightsRes, delRes, evalRes, confRes] = await Promise.all([
          sc.from("decision_rights_constitutions").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("decision_authority_domains").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("decision_rights").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("authority_delegations").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).eq("revocation_status", "active"),
          sc.from("decision_authority_evaluations").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("authority_conflict_events").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).is("resolved_at", null),
        ]);
        result = {
          constitutions: constRes.count ?? 0,
          domains: domRes.count ?? 0,
          rights: rightsRes.count ?? 0,
          active_delegations: delRes.count ?? 0,
          evaluations: evalRes.count ?? 0,
          open_conflicts: confRes.count ?? 0,
        };
        break;
      }

      case "constitutions": {
        const { data } = await sc.from("decision_rights_constitutions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
        result = data ?? [];
        break;
      }

      case "authority_domains": {
        const { data } = await sc.from("decision_authority_domains").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
        result = data ?? [];
        break;
      }

      case "decision_rights": {
        const { data } = await sc.from("decision_rights").select("*").eq("organization_id", organization_id).order("precedence_rank", { ascending: false }).limit(200);
        result = data ?? [];
        break;
      }

      case "evaluate": {
        // Simplified evaluation: find matching rights for the given actor/domain/decision
        const { domain_id, actor_ref, decision_type } = params;
        const { data: rights } = await sc.from("decision_rights").select("*").eq("organization_id", organization_id).eq("domain_id", domain_id).eq("active", true).order("precedence_rank", { ascending: false });

        const matching = (rights ?? []).filter((r: any) => (r.subject_ref === actor_ref || r.subject_ref === "*") && (r.decision_type === decision_type || r.decision_type === "*"));

        let evalResult = "denied";
        let legitimacy = 0;
        let explanation = "No matching decision rights found.";

        if (matching.length > 0) {
          const winner = matching[0];
          if (winner.authority_level === "prohibited") {
            evalResult = "denied"; explanation = "Authority is explicitly prohibited.";
          } else if (winner.authority_level === "advisory") {
            evalResult = "denied"; explanation = "Advisory influence only — not decision authority."; legitimacy = 20;
          } else {
            evalResult = winner.authority_level === "delegated" ? "delegated" : "allowed";
            legitimacy = winner.authority_level === "formal" ? 85 : 65;
            explanation = `Authority granted via ${winner.authority_level} right (rank ${winner.precedence_rank}).`;
          }
          if (matching.length > 1) {
            const levels = new Set(matching.map((m: any) => m.authority_level));
            if (levels.size > 1) { evalResult = "contested"; explanation = "Multiple conflicting authority claims detected."; }
          }
        }

        // Log evaluation
        await sc.from("decision_authority_evaluations").insert({
          organization_id,
          domain_id,
          decision_type: decision_type ?? "",
          actor_type: "user",
          actor_ref: actor_ref ?? "",
          context_payload: params,
          evaluation_result: evalResult,
          authority_basis: { matching_rights: matching.length },
          overlap_risk_score: matching.length > 1 ? 0.7 : 0,
          legitimacy_score: legitimacy,
          explanation_summary: explanation,
        });

        result = { evaluation_result: evalResult, legitimacy_score: legitimacy, explanation, matching_rights: matching.length };
        break;
      }

      case "delegations": {
        const { data } = await sc.from("authority_delegations").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = data ?? [];
        break;
      }

      case "conflict_events": {
        const { data } = await sc.from("authority_conflict_events").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = data ?? [];
        break;
      }

      case "recommendations": {
        const [{ count: openConflicts }, { count: activeDelegations }, { data: recentEvals }] = await Promise.all([
          sc.from("authority_conflict_events").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).is("resolved_at", null),
          sc.from("authority_delegations").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).eq("revocation_status", "active"),
          sc.from("decision_authority_evaluations").select("evaluation_result").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
        ]);
        const denied = (recentEvals ?? []).filter((e: any) => e.evaluation_result === "denied").length;
        const contested = (recentEvals ?? []).filter((e: any) => e.evaluation_result === "contested").length;
        const recs: string[] = [];
        if ((openConflicts ?? 0) > 0) recs.push(`Resolve ${openConflicts} open authority conflicts.`);
        if (denied > 10) recs.push("High denial rate suggests missing delegation or rights gaps.");
        if (contested > 0) recs.push("Contested authority detected — review overlapping rights.");
        if ((activeDelegations ?? 0) > 20) recs.push("High number of active delegations — consider consolidation.");
        if (recs.length === 0) recs.push("Decision rights posture is healthy.");
        result = { recommendations: recs };
        break;
      }

      case "explain": {
        const { evaluation_id } = params;
        const { data: ev } = await sc.from("decision_authority_evaluations").select("*").eq("id", evaluation_id).single();
        if (!ev) { result = { error: "Evaluation not found" }; break; }
        result = {
          domain_id: ev.domain_id,
          decision_type: ev.decision_type,
          actor: ev.actor_ref,
          result: ev.evaluation_result,
          legitimacy: ev.legitimacy_score,
          overlap_risk: ev.overlap_risk_score,
          explanation: ev.explanation_summary,
          basis: ev.authority_basis,
        };
        break;
      }

      default:
        result = { error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
