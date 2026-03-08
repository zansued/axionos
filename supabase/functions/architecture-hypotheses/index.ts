import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { action, organization_id, hypothesis_id } = await req.json();
    if (!organization_id) return json({ error: "organization_id required" }, 400);

    const { data: isMember } = await supabase.rpc("is_org_member", { _user_id: user.id, _org_id: organization_id });
    if (!isMember) return json({ error: "Not a member" }, 403);

    switch (action) {
      case "overview": {
        const [hypotheses, evidence, reviews, tags] = await Promise.all([
          supabase.from("architecture_hypotheses").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200),
          supabase.from("architecture_hypothesis_evidence").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(500),
          supabase.from("architecture_hypothesis_reviews").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
          supabase.from("architecture_hypothesis_tags").select("*").eq("organization_id", organization_id).limit(500),
        ]);

        const hl = hypotheses.data || [];
        const el = evidence.data || [];

        return json({
          kpis: {
            total: hl.length,
            candidates: hl.filter((h: any) => h.review_status === "candidate").length,
            high_risk: hl.filter((h: any) => h.risk_posture === "high" || h.risk_posture === "critical").length,
            low_confidence: hl.filter((h: any) => h.confidence_score < 0.4).length,
            simulation_ready: hl.filter((h: any) => h.simulation_ready).length,
            archived: hl.filter((h: any) => h.review_status === "archived").length,
          },
          hypotheses: hl,
          evidence: el.slice(0, 100),
          reviews: (reviews.data || []).slice(0, 50),
          tags: tags.data || [],
        });
      }

      case "hypothesis_detail": {
        if (!hypothesis_id) return json({ error: "hypothesis_id required" }, 400);
        const [hyp, ev, rev, tg] = await Promise.all([
          supabase.from("architecture_hypotheses").select("*").eq("id", hypothesis_id).single(),
          supabase.from("architecture_hypothesis_evidence").select("*").eq("hypothesis_id", hypothesis_id).order("created_at", { ascending: false }).limit(50),
          supabase.from("architecture_hypothesis_reviews").select("*").eq("hypothesis_id", hypothesis_id).order("created_at", { ascending: false }).limit(20),
          supabase.from("architecture_hypothesis_tags").select("*").eq("hypothesis_id", hypothesis_id).limit(30),
        ]);
        return json({ hypothesis: hyp.data, evidence: ev.data || [], reviews: rev.data || [], tags: tg.data || [] });
      }

      case "explain_hypothesis": {
        if (!hypothesis_id) return json({ error: "hypothesis_id required" }, 400);
        const { data: hyp } = await supabase.from("architecture_hypotheses").select("*").eq("id", hypothesis_id).single();
        if (!hyp) return json({ error: "Hypothesis not found" }, 404);

        const { data: ev } = await supabase.from("architecture_hypothesis_evidence").select("*").eq("hypothesis_id", hypothesis_id).limit(20);
        const evidence = ev || [];

        const explanations: string[] = [];
        explanations.push(`Hypothesis targets "${hyp.target_area}" (${hyp.hypothesis_type}).`);
        explanations.push(`Problem: ${hyp.problem_statement || "Not specified"}`);
        explanations.push(`Proposed idea: ${hyp.proposed_idea || "Not specified"}`);
        explanations.push(`Expected benefit: ${hyp.expected_benefit || "Not specified"}`);
        explanations.push(`Risk: ${hyp.risk_posture}. Uncertainty: ${hyp.uncertainty_posture}. Confidence: ${(hyp.confidence_score * 100).toFixed(0)}%.`);

        if (evidence.length > 0) {
          const strong = evidence.filter((e: any) => e.evidence_strength === "strong" || e.evidence_strength === "very_strong");
          explanations.push(`${evidence.length} evidence item(s), ${strong.length} strong/very_strong.`);
        } else {
          explanations.push("⚠️ No supporting evidence linked yet.");
        }

        if (hyp.uncertainty_posture === "very_high") explanations.push("⚠️ Very high uncertainty — requires significant validation before any consideration.");
        if (hyp.risk_posture === "critical") explanations.push("🔴 Critical risk — requires elevated review depth.");
        explanations.push(`This is a hypothesis only — it does NOT represent approved architectural direction.`);

        return json({ hypothesis: hyp, evidence, explanations });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
