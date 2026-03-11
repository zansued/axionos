import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSourceRegistration } from "../_shared/canon-intake/canon-source-registry.ts";
import { evaluateSourceTrust } from "../_shared/canon-intake/canon-source-trust-evaluator.ts";
import { enforceIntakePolicy } from "../_shared/canon-intake/canon-intake-policy-engine.ts";
import { initiateSyncRun, completeSyncRun } from "../_shared/canon-intake/canon-source-sync-manager.ts";
import { buildCandidateEntry } from "../_shared/canon-intake/canon-candidate-intake.ts";
import { explainCanonIntake, explainSourceTrust } from "../_shared/canon-intake/canon-source-explainer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { action, organization_id, payload } = await req.json();

    switch (action) {
      // ── Source CRUD ──
      case "register_source": {
        const result = buildSourceRegistration(payload);
        if (!result.valid) return json({ error: "Validation failed", errors: result.errors }, 400);
        const { data, error } = await supabase.from("canon_sources").insert({ organization_id, ...result.record }).select().single();
        if (error) throw error;
        return json(data);
      }

      case "list_sources": {
        let query = supabase.from("canon_sources").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
        if (payload?.status) query = query.eq("status", payload.status);
        if (payload?.source_type) query = query.eq("source_type", payload.source_type);
        const { data, error } = await query.limit(100);
        if (error) throw error;
        return json(data);
      }

      case "update_source": {
        const { id, ...updates } = payload;
        const { error } = await supabase.from("canon_sources").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      // ── Trust Profiles ──
      case "evaluate_trust": {
        const evaluation = evaluateSourceTrust(payload);
        const { error } = await supabase.from("canon_source_trust_profiles").upsert({
          organization_id,
          source_id: payload.source_id,
          trust_tier: evaluation.trust_tier,
          trust_score: evaluation.trust_score,
          allowed_ingestion_scope: evaluation.allowed_ingestion_scope,
          review_posture: evaluation.review_posture,
          promotable: evaluation.promotable,
          evaluation_notes: evaluation.rationale.join(", "),
          last_evaluated_at: new Date().toISOString(),
          evaluated_by: payload.evaluated_by || "system",
        }, { onConflict: "source_id" });
        if (error) throw error;
        return json(evaluation);
      }

      case "list_trust_profiles": {
        const { data, error } = await supabase.from("canon_source_trust_profiles").select("*").eq("organization_id", organization_id).order("trust_score", { ascending: false });
        if (error) throw error;
        return json(data);
      }

      // ── Candidate Intake ──
      case "submit_candidate": {
        const result = buildCandidateEntry(payload);
        if (!result.valid) return json({ error: "Validation failed", errors: result.errors }, 400);
        const { data, error } = await supabase.from("canon_candidate_entries").insert({ organization_id, ...result.candidate }).select().single();
        if (error) throw error;
        return json(data);
      }

      case "list_candidates": {
        let query = supabase.from("canon_candidate_entries").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
        if (payload?.promotion_status) query = query.eq("promotion_status", payload.promotion_status);
        if (payload?.source_id) query = query.eq("source_id", payload.source_id);
        const { data, error } = await query.limit(100);
        if (error) throw error;
        return json(data);
      }

      case "review_candidate": {
        const { id, verdict, review_notes, reviewed_by } = payload;
        const updates: Record<string, unknown> = { reviewed_by, updated_at: new Date().toISOString() };
        if (verdict === "approve") {
          updates.internal_validation_status = "approved";
        } else if (verdict === "reject") {
          updates.internal_validation_status = "rejected";
          updates.promotion_status = "rejected";
          updates.promotion_decision_reason = review_notes || "Rejected during review";
        }
        const { error } = await supabase.from("canon_candidate_entries").update(updates).eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      case "check_promotion_policy": {
        const result = enforceIntakePolicy(payload);
        return json(result);
      }

      // ── Sync Runs ──
      case "start_sync": {
        const result = initiateSyncRun(payload);
        if (!result.valid) return json({ error: "Validation failed", errors: result.errors }, 400);
        const { data, error } = await supabase.from("canon_source_sync_runs").insert({ organization_id, ...result.record }).select().single();
        if (error) throw error;
        return json(data);
      }

      case "complete_sync": {
        const updates = completeSyncRun(payload);
        const { error } = await supabase.from("canon_source_sync_runs").update(updates).eq("id", payload.run_id);
        if (error) throw error;
        // Update source last_synced_at
        if (payload.source_id) {
          await supabase.from("canon_sources").update({ last_synced_at: new Date().toISOString() }).eq("id", payload.source_id);
        }
        return json({ success: true });
      }

      case "list_sync_runs": {
        let query = supabase.from("canon_source_sync_runs").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
        if (payload?.source_id) query = query.eq("source_id", payload.source_id);
        const { data, error } = await query.limit(50);
        if (error) throw error;
        return json(data);
      }

      // ── Domains & Categories ──
      case "list_domains": {
        const { data, error } = await supabase.from("canon_source_domains").select("*").eq("organization_id", organization_id).order("domain_key");
        if (error) throw error;
        return json(data);
      }

      case "list_categories": {
        const { data, error } = await supabase.from("canon_source_categories").select("*").eq("organization_id", organization_id).order("sort_order");
        if (error) throw error;
        return json(data);
      }

      // ── Explainer ──
      case "explain": {
        const info = explainCanonIntake();
        if (payload?.trust_tier) {
          const narrative = explainSourceTrust(payload.trust_tier, payload.trust_score || 0);
          return json({ ...info, narrative });
        }
        return json(info);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
