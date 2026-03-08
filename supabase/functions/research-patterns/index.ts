import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, organization_id } = body;
    if (!organization_id) throw new Error("Missing organization_id");

    const { data: isMember } = await supabase.rpc("is_org_member", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isMember) throw new Error("Not a member of this organization");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    if (action === "overview") {
      const { data: patterns } = await userClient
        .from("architecture_synthesized_patterns")
        .select("id, pattern_class, confidence_posture, generalization_posture")
        .eq("organization_id", organization_id);

      const all = patterns || [];
      const total = all.length;
      const highConf = all.filter((p: any) => p.confidence_posture === "high" || p.confidence_posture === "very_high").length;
      const lowGen = all.filter((p: any) => p.generalization_posture === "narrow" || p.generalization_posture === "context_specific").length;
      const riskClass = all.filter((p: any) => p.pattern_class === "recurring_risk" || p.pattern_class === "anti_pattern").length;
      const oppClass = all.filter((p: any) => p.pattern_class === "recurring_opportunity" || p.pattern_class === "best_practice").length;

      const { count: reviewBacklog } = await userClient
        .from("architecture_synthesized_patterns")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization_id)
        .not("id", "in",
          `(SELECT pattern_id FROM architecture_pattern_reviews WHERE organization_id = '${organization_id}')`
        );

      return new Response(JSON.stringify({
        total,
        high_confidence: highConf,
        low_generalization: lowGen,
        recurring_risk_classes: riskClass,
        recurring_opportunity_classes: oppClass,
        review_backlog: reviewBacklog ?? 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list_patterns") {
      const { data: patterns } = await userClient
        .from("architecture_synthesized_patterns")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(100);

      return new Response(JSON.stringify({ patterns: patterns || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "pattern_detail") {
      const { pattern_id } = body;
      if (!pattern_id) throw new Error("Missing pattern_id");

      const [{ data: pattern }, { data: contributors }, { data: reviews }, { data: riskNotes }] = await Promise.all([
        userClient.from("architecture_synthesized_patterns").select("*").eq("id", pattern_id).eq("organization_id", organization_id).maybeSingle(),
        userClient.from("architecture_pattern_contributors").select("*").eq("pattern_id", pattern_id).eq("organization_id", organization_id).order("contribution_strength", { ascending: false }),
        userClient.from("architecture_pattern_reviews").select("*").eq("pattern_id", pattern_id).eq("organization_id", organization_id).order("created_at", { ascending: false }),
        userClient.from("architecture_pattern_risk_notes").select("*").eq("pattern_id", pattern_id).eq("organization_id", organization_id).order("created_at", { ascending: false }),
      ]);

      return new Response(JSON.stringify({
        pattern,
        contributors: contributors || [],
        reviews: reviews || [],
        risk_notes: riskNotes || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "explain_pattern") {
      const { pattern_id } = body;
      if (!pattern_id) throw new Error("Missing pattern_id");

      const { data: pattern } = await userClient
        .from("architecture_synthesized_patterns")
        .select("*")
        .eq("id", pattern_id)
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (!pattern) throw new Error("Pattern not found");

      const { data: contributors } = await userClient
        .from("architecture_pattern_contributors")
        .select("contributor_type, contribution_strength")
        .eq("pattern_id", pattern_id)
        .eq("organization_id", organization_id);

      const { data: riskNotes } = await userClient
        .from("architecture_pattern_risk_notes")
        .select("risk_type, risk_severity, risk_description")
        .eq("pattern_id", pattern_id)
        .eq("organization_id", organization_id);

      return new Response(JSON.stringify({
        pattern_name: pattern.pattern_name,
        pattern_class: pattern.pattern_class,
        recurring_theme: pattern.recurring_theme,
        confidence: pattern.confidence_posture,
        generalization: pattern.generalization_posture,
        abstraction_level: pattern.abstraction_level,
        sanitized_description: pattern.sanitized_description,
        risk_summary: pattern.risk_summary,
        opportunity_summary: pattern.opportunity_summary,
        contributing_evidence_classes: (contributors || []).map((c: any) => c.contributor_type),
        risk_notes: riskNotes || [],
        isolation_guarantee: "This pattern is synthesized from abstracted research outputs. No tenant-identifying information is exposed or retained in this pattern.",
        governance_note: "Synthesized patterns are advisory. They do not represent approved architectural direction and cannot directly trigger architecture changes.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
