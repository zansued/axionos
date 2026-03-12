import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCanonEntry } from "../_shared/canon-governance/canon-entry-builder.ts";
import { validateTransition } from "../_shared/canon-governance/canon-lifecycle-manager.ts";
import { aggregateReviews } from "../_shared/canon-governance/canon-review-workflow.ts";
import { assessDeprecation } from "../_shared/canon-governance/canon-deprecation-engine.ts";
import { explainCanonGovernance, explainEntryStatus } from "../_shared/canon-governance/canon-decision-explainer.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // Auth hardening — Sprint 197
    const authResult = await authenticateWithRateLimit(req, "canon-governance");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const body = await req.json();
    const { action, organization_id: payloadOrgId, payload } = body;

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organization_id) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(supabase, {
      organization_id, actor_id: user.id,
      function_name: "canon-governance", action: action || "unknown",
    });

    switch (action) {
      case "create_entry": {
        const built = buildCanonEntry(payload);
        if (built.validation_errors.length > 0) {
          return new Response(JSON.stringify({ error: "Validation failed", errors: built.validation_errors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { validation_errors, ...insertData } = built;
        const { data, error } = await supabase.from("canon_entries").insert({ organization_id, ...insertData }).select().single();
        if (error) throw error;

        // Create initial version
        await supabase.from("canon_entry_versions").insert({
          entry_id: data.id, organization_id, version_number: 1,
          title: data.title, summary: data.summary, body: data.body,
          implementation_guidance: data.implementation_guidance,
          change_description: "Initial creation", changed_by: payload.created_by,
        });

        // Status history
        await supabase.from("canon_entry_status_history").insert({
          entry_id: data.id, organization_id, from_status: "none", to_status: "draft",
          reason: "Entry created", changed_by: payload.created_by,
        });

        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_entry": {
        const { id, ...updates } = payload;
        const { data: current } = await supabase.from("canon_entries").select("*").eq("id", id).single();
        if (!current) throw new Error("Entry not found");

        const newVersion = (current.current_version || 1) + 1;
        const { error } = await supabase.from("canon_entries").update({ ...updates, current_version: newVersion, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;

        await supabase.from("canon_entry_versions").insert({
          entry_id: id, organization_id, version_number: newVersion,
          title: updates.title || current.title, summary: updates.summary || current.summary,
          body: updates.body || current.body, implementation_guidance: updates.implementation_guidance || current.implementation_guidance,
          change_description: updates.change_description || "Updated", changed_by: updates.changed_by,
        });

        return new Response(JSON.stringify({ success: true, version: newVersion }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_entries": {
        let query = supabase.from("canon_entries").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
        if (payload?.lifecycle_status) query = query.eq("lifecycle_status", payload.lifecycle_status);
        if (payload?.canon_type) query = query.eq("canon_type", payload.canon_type);
        if (payload?.category_id) query = query.eq("category_id", payload.category_id);
        const { data, error } = await query.limit(100);
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_entry": {
        const { data, error } = await supabase.from("canon_entries").select("*").eq("id", payload.id).single();
        if (error) throw error;
        const { data: versions } = await supabase.from("canon_entry_versions").select("*").eq("entry_id", payload.id).order("version_number", { ascending: false });
        const { data: reviews } = await supabase.from("canon_entry_reviews").select("*").eq("entry_id", payload.id).order("created_at", { ascending: false });
        return new Response(JSON.stringify({ entry: data, versions, reviews }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "review_entry": {
        const { error } = await supabase.from("canon_entry_reviews").insert({
          entry_id: payload.entry_id, organization_id,
          reviewer_id: payload.reviewer_id, review_type: payload.review_type || "standard",
          verdict: payload.verdict, confidence_assessment: payload.confidence_assessment || 0,
          strengths: payload.strengths || [], weaknesses: payload.weaknesses || [],
          review_notes: payload.review_notes || "",
        });
        if (error) throw error;

        // Aggregate and potentially update entry
        const { data: allReviews } = await supabase.from("canon_entry_reviews").select("verdict, confidence_assessment").eq("entry_id", payload.entry_id);
        const agg = aggregateReviews(allReviews || []);

        return new Response(JSON.stringify({ success: true, aggregation: agg }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "transition_status": {
        const { id, to_status, reason, changed_by } = payload;
        const { data: current } = await supabase.from("canon_entries").select("lifecycle_status").eq("id", id).single();
        if (!current) throw new Error("Entry not found");

        const result = validateTransition(current.lifecycle_status, to_status);
        if (!result.allowed) {
          return new Response(JSON.stringify({ error: result.reason }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        await supabase.from("canon_entries").update({ lifecycle_status: to_status, updated_at: new Date().toISOString() }).eq("id", id);
        await supabase.from("canon_entry_status_history").insert({
          entry_id: id, organization_id, from_status: current.lifecycle_status,
          to_status, reason: reason || "", changed_by,
        });

        return new Response(JSON.stringify({ success: true, transition: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "deprecate_entry": {
        const assessment = assessDeprecation(payload);
        if (!assessment.safe_to_deprecate) {
          return new Response(JSON.stringify({ error: "Unsafe to deprecate", assessment }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        await supabase.from("canon_entries").update({
          lifecycle_status: "deprecated", deprecation_reason: payload.reason,
          updated_at: new Date().toISOString(),
        }).eq("id", payload.entry_id);

        await supabase.from("canon_deprecations").insert({
          entry_id: payload.entry_id, organization_id, reason: payload.reason,
          deprecated_by: payload.deprecated_by, replacement_entry_id: payload.replacement_entry_id,
          impact_assessment: assessment.impact_assessment,
        });

        return new Response(JSON.stringify({ success: true, assessment }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "supersede_entry": {
        const { predecessor_id, successor_id, reason } = payload;
        await supabase.from("canon_supersession_links").insert({
          organization_id, predecessor_entry_id: predecessor_id,
          successor_entry_id: successor_id, reason: reason || "",
        });
        await supabase.from("canon_entries").update({
          lifecycle_status: "superseded", superseded_by: successor_id,
          updated_at: new Date().toISOString(),
        }).eq("id", predecessor_id);

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "explain": {
        const info = explainCanonGovernance();
        if (payload?.entry_status) {
          const narrative = explainEntryStatus(payload.entry_status, payload.confidence || 0, payload.review_count || 0);
          return new Response(JSON.stringify({ ...info, narrative }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(info), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
