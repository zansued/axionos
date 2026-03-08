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
    if (!authHeader) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: corsHeaders });

    let result: unknown;

    switch (action) {
      case "overview": {
        const [{ data: cases }, { data: classes }, { data: reviews }, { data: restrictions }, { data: outcomes }] = await Promise.all([
          supabase.from("capability_exposure_governance_cases").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("capability_exposure_classes").select("*").eq("organization_id", organization_id).limit(50),
          supabase.from("capability_exposure_reviews").select("*").eq("organization_id", organization_id).limit(100),
          supabase.from("capability_exposure_restrictions").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("capability_exposure_governance_outcomes").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const allCases = cases || [];
        const allRestrictions = restrictions || [];

        result = {
          total_cases: allCases.length,
          classes_defined: (classes || []).length,
          pending_reviews: (reviews || []).filter((r: any) => r.review_status === "pending").length,
          total_restrictions: allRestrictions.length,
          never_expose_count: allRestrictions.filter((r: any) => r.restriction_type === "never_expose").length,
          internal_only_count: allRestrictions.filter((r: any) => r.restriction_type === "internal_only").length,
          partner_limited_count: allRestrictions.filter((r: any) => r.restriction_type === "partner_limited").length,
          sandbox_only_count: allRestrictions.filter((r: any) => r.restriction_type === "sandbox_only").length,
          future_candidate_count: allRestrictions.filter((r: any) => r.restriction_type === "controlled_future_candidate").length,
          outcome_count: (outcomes || []).length,
          ecosystem_activation_status: "frozen",
          governance_mode: "advisory_first",
          cases_by_decision: allCases.reduce((acc: Record<string, number>, c: any) => { acc[c.decision_status] = (acc[c.decision_status] || 0) + 1; return acc; }, {}),
        };
        break;
      }

      case "build_cases": {
        const { data: inventory } = await supabase.from("ecosystem_capability_inventory").select("*").eq("organization_id", organization_id);
        const { data: existingCases } = await supabase.from("capability_exposure_governance_cases").select("capability_name").eq("organization_id", organization_id);
        const existingNames = new Set((existingCases || []).map((c: any) => c.capability_name));
        const newCapabilities = (inventory || []).filter((c: any) => !existingNames.has(c.capability_name));
        result = { existing_cases: (existingCases || []).length, new_candidates: newCapabilities.length, inventory_total: (inventory || []).length };
        break;
      }

      case "classify_exposure": {
        const { data: cases } = await supabase.from("capability_exposure_governance_cases").select("*, capability_exposure_classes(class_name, class_key)").eq("organization_id", organization_id);
        const distribution = (cases || []).reduce((acc: Record<string, number>, c: any) => { acc[c.restriction_level] = (acc[c.restriction_level] || 0) + 1; return acc; }, {});
        result = { classification_distribution: distribution, cases: cases || [] };
        break;
      }

      case "evaluate_gates": {
        const { data: cases } = await supabase.from("capability_exposure_governance_cases").select("*").eq("organization_id", organization_id);
        const gateResults = (cases || []).map((c: any) => ({
          capability_name: c.capability_name,
          safety_gate: c.safety_gate_score >= 0.5 ? "pass" : "fail",
          trust_gate: c.trust_gate_score >= 0.5 ? "pass" : "fail",
          policy_gate: c.policy_gate_score >= 0.5 ? "pass" : "fail",
          auditability_gate: c.auditability_score >= 0.5 ? "pass" : "fail",
          overall: c.exposure_governance_score,
        }));
        result = { gate_evaluations: gateResults };
        break;
      }

      case "analyze_restrictions": {
        const { data: restrictions } = await supabase.from("capability_exposure_restrictions").select("*, capability_exposure_governance_cases(capability_name, capability_domain)").eq("organization_id", organization_id);
        result = { restrictions: restrictions || [] };
        break;
      }

      case "review_queue": {
        const { data: cases } = await supabase.from("capability_exposure_governance_cases").select("*").eq("organization_id", organization_id).in("review_status", ["pending", "under_review"]).order("exposure_governance_score", { ascending: false });
        result = { review_queue: cases || [] };
        break;
      }

      case "governance_outcomes": {
        const { data: outcomes } = await supabase.from("capability_exposure_governance_outcomes").select("*, capability_exposure_governance_cases(capability_name)").eq("organization_id", organization_id);
        result = { outcomes: outcomes || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "Capability exposure governance is advisory-first and governance-driven. No external exposure is activated in Sprint 57. All classifications, gate evaluations, and recommendations require human review.",
          exposure_classes: ["never_expose", "internal_only", "partner_limited", "sandbox_only", "controlled_future_candidate"],
          gates: ["safety_gate", "trust_gate", "policy_gate", "auditability_gate"],
          review_states: ["pending", "under_review", "approved_for_future", "delayed", "rejected", "restricted"],
          safety_constraints: [
            "No marketplace activation",
            "No external capability activation",
            "No autonomous trust establishment",
            "All outputs are advisory-first",
            "Human review required for all decisions",
          ],
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, data: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
