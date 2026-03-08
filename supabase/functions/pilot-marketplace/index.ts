import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { action, organization_id, ...params } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: corsHeaders });

    let result: unknown = null;

    switch (action) {
      case "overview": {
        const [parts, subs, expo] = await Promise.all([
          supabase.from("ecosystem_participants").select("id, participation_status, trust_status").eq("organization_id", organization_id),
          supabase.from("pilot_capability_submissions").select("id, submission_status, risk_posture").eq("organization_id", organization_id),
          supabase.from("pilot_marketplace_exposure").select("id, exposure_status").eq("organization_id", organization_id),
        ]);
        const participants = parts.data || [];
        const submissions = subs.data || [];
        const exposures = expo.data || [];
        result = {
          active_participants: participants.filter((p: any) => p.participation_status === "active").length,
          total_participants: participants.length,
          suspended_participants: participants.filter((p: any) => p.participation_status === "suspended").length,
          total_submissions: submissions.length,
          approved_submissions: submissions.filter((s: any) => s.submission_status === "approved").length,
          rejected_submissions: submissions.filter((s: any) => s.submission_status === "rejected").length,
          pending_submissions: submissions.filter((s: any) => s.submission_status === "submitted" || s.submission_status === "under_review").length,
          high_risk_submissions: submissions.filter((s: any) => s.risk_posture === "high" || s.risk_posture === "critical").length,
          active_exposures: exposures.filter((e: any) => e.exposure_status === "pilot_active").length,
        };
        break;
      }

      case "list_participants": {
        const { data } = await supabase.from("ecosystem_participants").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = data || [];
        break;
      }

      case "list_submissions": {
        const { data } = await supabase.from("pilot_capability_submissions").select("*, ecosystem_participants(id, participant_name, participant_type)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = data || [];
        break;
      }

      case "list_exposures": {
        const { data } = await supabase.from("pilot_marketplace_exposure").select("*, pilot_capability_submissions(id, submission_name, submission_status)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = data || [];
        break;
      }

      case "register_participant": {
        const { participant_name, participant_type } = params;
        const { data, error } = await supabase.from("ecosystem_participants").insert({
          organization_id, participant_name: participant_name || "", participant_type: participant_type || "partner",
          trust_status: "pending_review", participation_status: "pending",
        }).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      case "submit_capability_for_pilot": {
        const { participant_id, submission_name, submission_description, capability_package_id, risk_posture, rollback_ready, affected_surfaces } = params;
        const { data, error } = await supabase.from("pilot_capability_submissions").insert({
          organization_id, participant_id, submission_name: submission_name || "", submission_description: submission_description || "",
          capability_package_id: capability_package_id || null, risk_posture: risk_posture || "medium",
          rollback_ready: rollback_ready || false, affected_surfaces: affected_surfaces || [],
          submission_status: "submitted",
        }).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      case "review_submission": {
        const { submission_id, review_action: ra, review_notes, compatibility_assessment, risk_assessment, conditions } = params;
        const { data: review, error } = await supabase.from("pilot_marketplace_reviews").insert({
          organization_id, submission_id, reviewer_id: user.id, review_action: ra,
          review_notes: review_notes || "", compatibility_assessment: compatibility_assessment || {},
          risk_assessment: risk_assessment || {}, conditions: conditions || [],
        }).select().single();
        if (error) throw error;

        const statusMap: Record<string, string> = { approved: "approved", rejected: "rejected", suspended: "suspended", needs_changes: "under_review" };
        if (statusMap[ra]) {
          await supabase.from("pilot_capability_submissions").update({ submission_status: statusMap[ra] }).eq("id", submission_id);
        }

        if (ra === "approved") {
          await supabase.from("pilot_marketplace_exposure").insert({
            organization_id, submission_id, exposure_status: "pilot_active", exposure_scope: "internal_only", exposed_at: new Date().toISOString(),
          });
        }
        result = review;
        break;
      }

      case "suspend_participant": {
        const { participant_id } = params;
        const { data, error } = await supabase.from("ecosystem_participants").update({
          participation_status: "suspended", audit_metadata: { suspended_by: user.id, suspended_at: new Date().toISOString() },
        }).eq("id", participant_id).eq("organization_id", organization_id).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      case "explain_submission": {
        const { submission_id } = params;
        const { data: sub } = await supabase.from("pilot_capability_submissions").select("*, ecosystem_participants(id, participant_name, participant_type, trust_status)").eq("id", submission_id).single();
        if (!sub) { result = { error: "Not found" }; break; }
        const { data: reviews } = await supabase.from("pilot_marketplace_reviews").select("*").eq("submission_id", submission_id).order("created_at", { ascending: false }).limit(10);
        const { data: expo } = await supabase.from("pilot_marketplace_exposure").select("*").eq("submission_id", submission_id).maybeSingle();
        result = {
          submission: sub, reviews: reviews || [], exposure: expo,
          explanation: {
            submitted_by: (sub as any).ecosystem_participants?.participant_name || "Unknown",
            participant_trust: (sub as any).ecosystem_participants?.trust_status || "unknown",
            status: sub.submission_status, risk: sub.risk_posture, rollback_ready: sub.rollback_ready,
            compatibility: sub.compatibility_posture, exposure_status: expo?.exposure_status || "not_exposed",
          },
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
