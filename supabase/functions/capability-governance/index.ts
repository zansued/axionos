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
        const [ent, req_, trust, reviews] = await Promise.all([
          supabase.from("capability_entitlements").select("id, entitlement_status").eq("organization_id", organization_id),
          supabase.from("capability_access_requests").select("id, request_status").eq("organization_id", organization_id),
          supabase.from("capability_trust_postures").select("id, trust_level, risk_posture").eq("organization_id", organization_id),
          supabase.from("capability_approval_reviews").select("id, review_action").eq("organization_id", organization_id),
        ]);
        const entitlements = ent.data || [];
        const requests = req_.data || [];
        const postures = trust.data || [];
        result = {
          total_entitlements: entitlements.length,
          active_entitlements: entitlements.filter((e: any) => e.entitlement_status === "active").length,
          pending_requests: requests.filter((r: any) => r.request_status === "pending").length,
          total_requests: requests.length,
          rejected_requests: requests.filter((r: any) => r.request_status === "rejected").length,
          high_risk_capabilities: postures.filter((p: any) => p.risk_posture === "high" || p.risk_posture === "critical").length,
          suspended_capabilities: postures.filter((p: any) => p.trust_level === "suspended").length,
          revoked_entitlements: entitlements.filter((e: any) => e.entitlement_status === "revoked").length,
        };
        break;
      }

      case "list_requests": {
        const { data } = await supabase
          .from("capability_access_requests")
          .select("*, capability_packages(id, package_name, category)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(100);
        result = data || [];
        break;
      }

      case "list_entitlements": {
        const { data } = await supabase
          .from("capability_entitlements")
          .select("*, capability_packages(id, package_name, category)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(100);
        result = data || [];
        break;
      }

      case "list_trust_postures": {
        const { data } = await supabase
          .from("capability_trust_postures")
          .select("*, capability_packages(id, package_name, category)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(100);
        result = data || [];
        break;
      }

      case "request_access": {
        const { capability_package_id, request_reason, requested_access_level } = params;
        const { data, error } = await supabase.from("capability_access_requests").insert({
          organization_id,
          capability_package_id,
          requested_by: user.id,
          request_reason: request_reason || "",
          requested_access_level: requested_access_level || "use",
          request_status: "pending",
        }).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      case "review_request": {
        const { request_id, review_action: ra, review_notes, conditions } = params;
        const { data: review, error: revErr } = await supabase.from("capability_approval_reviews").insert({
          organization_id,
          request_id,
          reviewer_id: user.id,
          review_action: ra,
          review_notes: review_notes || "",
          conditions: conditions || [],
        }).select().single();
        if (revErr) throw revErr;

        if (ra === "approved" || ra === "rejected") {
          await supabase.from("capability_access_requests").update({
            request_status: ra,
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
            resolution_notes: review_notes || "",
          }).eq("id", request_id);
        }

        if (ra === "approved") {
          const { data: reqData } = await supabase.from("capability_access_requests").select("*").eq("id", request_id).single();
          if (reqData) {
            await supabase.from("capability_entitlements").insert({
              organization_id,
              capability_package_id: reqData.capability_package_id,
              principal_type: "user",
              principal_id: reqData.requested_by,
              access_level: reqData.requested_access_level,
              entitlement_status: "active",
              approval_required: true,
              granted_by: user.id,
              granted_at: new Date().toISOString(),
            });
          }
        }
        result = review;
        break;
      }

      case "revoke_entitlement": {
        const { entitlement_id } = params;
        const { data, error } = await supabase.from("capability_entitlements").update({
          entitlement_status: "revoked",
          audit_metadata: { revoked_by: user.id, revoked_at: new Date().toISOString() },
        }).eq("id", entitlement_id).eq("organization_id", organization_id).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      case "set_trust_posture": {
        const { capability_package_id, trust_level, risk_posture, review_notes: notes } = params;
        const { data: existing } = await supabase.from("capability_trust_postures")
          .select("id").eq("organization_id", organization_id).eq("capability_package_id", capability_package_id).maybeSingle();

        if (existing) {
          const { data, error } = await supabase.from("capability_trust_postures").update({
            trust_level, risk_posture, review_notes: notes || "", reviewed_by: user.id, reviewed_at: new Date().toISOString(),
          }).eq("id", existing.id).select().single();
          if (error) throw error;
          result = data;
        } else {
          const { data, error } = await supabase.from("capability_trust_postures").insert({
            organization_id, capability_package_id, trust_level, risk_posture,
            review_notes: notes || "", reviewed_by: user.id, reviewed_at: new Date().toISOString(),
          }).select().single();
          if (error) throw error;
          result = data;
        }
        break;
      }

      case "explain_entitlement": {
        const { entitlement_id } = params;
        const { data: ent } = await supabase.from("capability_entitlements")
          .select("*, capability_packages(id, package_name, category, lifecycle_status, required_scopes)")
          .eq("id", entitlement_id).single();
        if (!ent) { result = { error: "Not found" }; break; }

        const { data: trust } = await supabase.from("capability_trust_postures")
          .select("*").eq("organization_id", organization_id).eq("capability_package_id", ent.capability_package_id).maybeSingle();

        const { data: reviews } = await supabase.from("capability_approval_reviews")
          .select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(10);

        result = {
          entitlement: ent,
          trust_posture: trust || null,
          recent_reviews: reviews || [],
          explanation: {
            capability_name: (ent as any).capability_packages?.package_name || "Unknown",
            access_level: ent.access_level,
            status: ent.entitlement_status,
            trust_level: trust?.trust_level || "unknown",
            risk_posture: trust?.risk_posture || "unknown",
            why_restricted: trust?.trust_level === "suspended" ? "Capability is suspended" :
              trust?.risk_posture === "critical" ? "Critical risk posture" : "Standard governance applies",
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
