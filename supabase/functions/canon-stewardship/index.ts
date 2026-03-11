import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeCanonEntry } from "../_shared/canon-stewardship/canon-normalizer.ts";
import { detectDuplicates } from "../_shared/canon-stewardship/canon-duplicate-detector.ts";
import { analyzeConflicts } from "../_shared/canon-stewardship/canon-conflict-analyzer.ts";
import { buildStewardshipReview, assessDeprecation } from "../_shared/canon-stewardship/canon-stewardship-engine.ts";
import { buildSupersession } from "../_shared/canon-stewardship/canon-supersession-manager.ts";
import { explainStewardship, explainReviewVerdict } from "../_shared/canon-stewardship/canon-review-explainer.ts";

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
      // ── Normalize ──
      case "normalize_entry": {
        const result = normalizeCanonEntry(payload);
        return json(result);
      }

      // ── Duplicate Detection ──
      case "check_duplicates": {
        const { data: existing } = await supabase
          .from("canon_entries")
          .select("id, title, topic, practice_type, stack_scope")
          .eq("organization_id", organization_id)
          .neq("lifecycle_status", "deprecated");
        const result = detectDuplicates(payload, existing || []);
        return json(result);
      }

      // ── Conflict Analysis ──
      case "analyze_conflicts": {
        const { data: existing } = await supabase
          .from("canon_entries")
          .select("id, title, practice_type, anti_pattern_flag, stack_scope, topic")
          .eq("organization_id", organization_id)
          .neq("lifecycle_status", "deprecated");
        const mapped = (existing || []).map((e: any) => ({ entry_id: e.id, ...e }));
        const result = analyzeConflicts(payload, mapped);

        // Persist detected conflicts
        if (result.has_conflicts) {
          for (const c of result.conflicts) {
            await supabase.from("canon_entry_conflicts").insert({
              organization_id,
              entry_a_id: payload.entry_id,
              entry_b_id: c.conflicting_entry_id,
              conflict_type: c.conflict_type,
              conflict_description: c.description,
              severity: c.severity,
              detected_by: payload.detected_by || "system",
            });
          }
        }
        return json(result);
      }

      // ── List Conflicts ──
      case "list_conflicts": {
        let query = supabase.from("canon_entry_conflicts").select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false });
        if (payload?.resolution_status) query = query.eq("resolution_status", payload.resolution_status);
        const { data, error } = await query.limit(100);
        if (error) throw error;
        return json(data);
      }

      // ── Resolve Conflict ──
      case "resolve_conflict": {
        const { id, resolution_notes, resolved_by } = payload;
        const { error } = await supabase.from("canon_entry_conflicts").update({
          resolution_status: "resolved",
          resolution_notes: resolution_notes || "",
          resolved_by,
          updated_at: new Date().toISOString(),
        }).eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      // ── Stewardship Review ──
      case "submit_review": {
        const result = buildStewardshipReview(payload);
        if (!result.valid) return json({ error: "Validation failed", errors: result.errors }, 400);
        const { error } = await supabase.from("canon_entry_reviews").insert({
          organization_id, ...result.review,
        });
        if (error) throw error;

        // If approved, update entry status
        if (payload.verdict === "approve") {
          await supabase.from("canon_entries").update({
            approval_status: "approved",
            lifecycle_status: "approved",
            reviewed_by: payload.reviewer_id,
            updated_at: new Date().toISOString(),
          }).eq("id", payload.entry_id);

          await supabase.from("canon_entry_status_history").insert({
            entry_id: payload.entry_id, organization_id,
            from_status: "draft", to_status: "approved",
            reason: payload.review_notes || "Approved via stewardship review",
            changed_by: payload.reviewer_id,
          });
        } else if (payload.verdict === "reject") {
          await supabase.from("canon_entries").update({
            approval_status: "rejected",
            reviewed_by: payload.reviewer_id,
            updated_at: new Date().toISOString(),
          }).eq("id", payload.entry_id);
        }

        return json({ success: true });
      }

      // ── List Reviews ──
      case "list_reviews": {
        let query = supabase.from("canon_entry_reviews").select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false });
        if (payload?.entry_id) query = query.eq("entry_id", payload.entry_id);
        const { data, error } = await query.limit(100);
        if (error) throw error;
        return json(data);
      }

      // ── Supersession ──
      case "supersede_entry": {
        const result = buildSupersession(payload);
        if (!result.valid) return json({ error: "Validation failed", errors: result.errors }, 400);
        await supabase.from("canon_supersession_links").insert({
          organization_id, ...result.record,
        });
        await supabase.from("canon_entries").update({
          lifecycle_status: "superseded",
          superseded_by: payload.successor_id,
          updated_at: new Date().toISOString(),
        }).eq("id", payload.predecessor_id);

        await supabase.from("canon_entry_status_history").insert({
          entry_id: payload.predecessor_id, organization_id,
          from_status: "approved", to_status: "superseded",
          reason: payload.reason, changed_by: payload.superseded_by,
        });
        return json({ success: true });
      }

      // ── List Supersessions ──
      case "list_supersessions": {
        const { data, error } = await supabase
          .from("canon_supersession_links")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return json(data);
      }

      // ── Deprecation ──
      case "deprecate_entry": {
        const assessment = assessDeprecation(payload);
        if (!assessment.valid) return json({ error: "Validation failed", errors: assessment.errors }, 400);
        if (!assessment.safe_to_deprecate) return json({ error: "Unsafe to deprecate", assessment }, 400);

        await supabase.from("canon_entries").update({
          lifecycle_status: "deprecated",
          deprecation_reason: payload.reason,
          updated_at: new Date().toISOString(),
        }).eq("id", payload.entry_id);

        await supabase.from("canon_entry_status_history").insert({
          entry_id: payload.entry_id, organization_id,
          from_status: "approved", to_status: "deprecated",
          reason: payload.reason, changed_by: payload.deprecated_by,
        });

        if (payload.replacement_entry_id) {
          await supabase.from("canon_deprecations").insert({
            entry_id: payload.entry_id, organization_id,
            reason: payload.reason, deprecated_by: payload.deprecated_by,
            replacement_entry_id: payload.replacement_entry_id,
          });
        }

        return json({ success: true, assessment });
      }

      // ── Canon Library ──
      case "list_library": {
        let query = supabase.from("canon_entries").select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false });
        if (payload?.lifecycle_status) query = query.eq("lifecycle_status", payload.lifecycle_status);
        if (payload?.practice_type) query = query.eq("practice_type", payload.practice_type);
        if (payload?.topic) query = query.eq("topic", payload.topic);
        if (payload?.approval_status) query = query.eq("approval_status", payload.approval_status);
        const { data, error } = await query.limit(100);
        if (error) throw error;
        return json(data);
      }

      // ── Entry Detail ──
      case "get_entry_detail": {
        const { data: entry, error } = await supabase.from("canon_entries").select("*").eq("id", payload.id).single();
        if (error) throw error;
        const { data: versions } = await supabase.from("canon_entry_versions").select("*").eq("entry_id", payload.id).order("version_number", { ascending: false });
        const { data: reviews } = await supabase.from("canon_entry_reviews").select("*").eq("entry_id", payload.id).order("created_at", { ascending: false });
        const { data: conflicts } = await supabase.from("canon_entry_conflicts").select("*").or(`entry_a_id.eq.${payload.id},entry_b_id.eq.${payload.id}`);
        const { data: domains } = await supabase.from("canon_entry_domains").select("*").eq("entry_id", payload.id);
        const { data: constraints } = await supabase.from("canon_entry_usage_constraints").select("*").eq("entry_id", payload.id);
        return json({ entry, versions, reviews, conflicts, domains, constraints });
      }

      // ── Explainer ──
      case "explain": {
        const info = explainStewardship();
        if (payload?.verdict) {
          const narrative = explainReviewVerdict(payload.verdict, payload.confidence || 0);
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
