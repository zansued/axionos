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

      // ── Promote Candidate to Canon Entry ──
      case "promote_to_canon": {
        const { candidate_id, approved_by } = payload;
        if (!candidate_id) return json({ error: "candidate_id required" }, 400);

        // Fetch candidate
        const { data: candidate, error: cErr } = await supabase
          .from("canon_candidate_entries")
          .select("*")
          .eq("id", candidate_id)
          .eq("organization_id", organization_id)
          .single();
        if (cErr || !candidate) return json({ error: "Candidate not found" }, 404);

        if (candidate.promotion_status === "promoted") {
          return json({ error: "Candidate already promoted", existing_entry_id: candidate.promoted_entry_id }, 409);
        }

        // Build canon entry from candidate
        const slug = candidate.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80);

        const canonEntry = {
          organization_id,
          title: candidate.title,
          slug: `${slug}-${Date.now()}`,
          canon_type: candidate.knowledge_type === "anti_pattern" ? "anti_pattern" : "pattern",
          practice_type: candidate.knowledge_type || "pattern",
          lifecycle_status: "active",
          approval_status: "approved",
          confidence_score: Math.min((candidate.source_reliability_score || 50) / 100, 1),
          summary: candidate.summary || "",
          body: candidate.body || "",
          implementation_guidance: "",
          stack_scope: candidate.domain_scope || "general",
          layer_scope: "general",
          problem_scope: "general",
          topic: candidate.domain_scope || "general",
          subtopic: candidate.knowledge_type || "pattern",
          tags: [],
          source_reference: candidate.source_reference || "",
          source_type: candidate.source_type || "external_documentation",
          source_candidate_id: candidate.id,
          approved_by: approved_by || "system",
          created_by: candidate.submitted_by || "canon-intake",
          metadata: {},
          structured_guidance: {},
        };

        const { data: entry, error: insertErr } = await supabase
          .from("canon_entries")
          .insert(canonEntry)
          .select()
          .single();
        if (insertErr) throw insertErr;

        // Update candidate
        await supabase.from("canon_candidate_entries").update({
          promotion_status: "promoted",
          promoted_entry_id: entry.id,
          promoted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", candidate_id);

        // Update source lifecycle if exists
        if (candidate.source_id) {
          await supabase.from("canon_sources").update({
            ingestion_lifecycle_state: "canon_promoted",
            updated_at: new Date().toISOString(),
          }).eq("id", candidate.source_id);
        }

        return json({ success: true, entry });
      }

      // ── Batch Promote All Approved Candidates ──
      case "batch_promote": {
        const { data: approved, error: aErr } = await supabase
          .from("canon_candidate_entries")
          .select("id")
          .eq("organization_id", organization_id)
          .eq("internal_validation_status", "approved")
          .eq("promotion_status", "pending");
        if (aErr) throw aErr;

        let promoted = 0;
        for (const cand of (approved || [])) {
          try {
            const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/canon-intake`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "promote_to_canon",
                organization_id,
                payload: { candidate_id: cand.id, approved_by: "batch_promote" },
              }),
            });
            const result = await resp.json();
            if (result.success) promoted++;
          } catch (e) {
            console.error("Batch promote error for", cand.id, e);
          }
        }

        return json({ success: true, promoted, total_eligible: (approved || []).length });
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
