import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type PromotionStage = "draft" | "under_review" | "approved" | "active" | "deprecated";
type ApprovalStatus = "pending" | "approved" | "rejected";

const STAGE_TRANSITIONS: Record<PromotionStage, PromotionStage[]> = {
  draft: ["under_review"],
  under_review: ["approved", "draft"],
  approved: ["active"],
  active: ["deprecated"],
  deprecated: [],
};

function validateStageTransition(from: PromotionStage, to: PromotionStage): boolean {
  return (STAGE_TRANSITIONS[from] || []).includes(to);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, organization_id: orgId } = body;

    if (!orgId) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── create_record_from_candidate ─── */
    if (action === "create_record_from_candidate") {
      const { candidate_id } = body;
      if (!candidate_id) {
        return new Response(JSON.stringify({ error: "candidate_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch learning candidate
      const { data: candidate, error: cErr } = await supabase
        .from("learning_candidates")
        .select("*")
        .eq("id", candidate_id)
        .eq("organization_id", orgId)
        .single();

      if (cErr || !candidate) {
        return new Response(JSON.stringify({ error: "Candidate not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for existing record
      const { data: existing } = await supabase
        .from("canon_learning_records")
        .select("id")
        .eq("candidate_id", candidate_id)
        .eq("organization_id", orgId)
        .not("promotion_stage", "eq", "deprecated")
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ error: "Canon record already exists for this candidate", existing_id: existing[0].id }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: record, error: insertErr } = await supabase
        .from("canon_learning_records")
        .insert({
          organization_id: orgId,
          candidate_id,
          promotion_stage: "draft",
          review_required: true,
          confidence_score: candidate.confidence_score || 0,
          approval_status: "pending",
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ record, message: "Canon record created from candidate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── review_record ─── */
    if (action === "review_record") {
      const { record_id, review_notes } = body;
      if (!record_id) {
        return new Response(JSON.stringify({ error: "record_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: record, error: rErr } = await supabase
        .from("canon_learning_records")
        .select("*")
        .eq("id", record_id)
        .eq("organization_id", orgId)
        .single();

      if (rErr || !record) {
        return new Response(JSON.stringify({ error: "Record not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!validateStageTransition(record.promotion_stage as PromotionStage, "under_review")) {
        return new Response(JSON.stringify({ error: `Cannot transition from '${record.promotion_stage}' to 'under_review'` }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updated, error: uErr } = await supabase
        .from("canon_learning_records")
        .update({
          promotion_stage: "under_review",
          review_notes: review_notes || "",
        })
        .eq("id", record_id)
        .select()
        .single();

      if (uErr) throw uErr;

      return new Response(JSON.stringify({ record: updated, message: "Record moved to review" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── approve_record ─── */
    if (action === "approve_record") {
      const { record_id, review_notes } = body;
      if (!record_id) {
        return new Response(JSON.stringify({ error: "record_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: record, error: rErr } = await supabase
        .from("canon_learning_records")
        .select("*")
        .eq("id", record_id)
        .eq("organization_id", orgId)
        .single();

      if (rErr || !record) {
        return new Response(JSON.stringify({ error: "Record not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!validateStageTransition(record.promotion_stage as PromotionStage, "approved")) {
        return new Response(JSON.stringify({ error: `Cannot approve from '${record.promotion_stage}'. Must be 'under_review'.` }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updated, error: uErr } = await supabase
        .from("canon_learning_records")
        .update({
          promotion_stage: "approved",
          approval_status: "approved",
          review_notes: review_notes || record.review_notes,
        })
        .eq("id", record_id)
        .select()
        .single();

      if (uErr) throw uErr;

      return new Response(JSON.stringify({ record: updated, message: "Record approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── activate_record ─── */
    if (action === "activate_record") {
      const { record_id } = body;
      if (!record_id) {
        return new Response(JSON.stringify({ error: "record_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: record, error: rErr } = await supabase
        .from("canon_learning_records")
        .select("*")
        .eq("id", record_id)
        .eq("organization_id", orgId)
        .single();

      if (rErr || !record) {
        return new Response(JSON.stringify({ error: "Record not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!validateStageTransition(record.promotion_stage as PromotionStage, "active")) {
        return new Response(JSON.stringify({ error: `Cannot activate from '${record.promotion_stage}'. Must be 'approved'.` }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updated, error: uErr } = await supabase
        .from("canon_learning_records")
        .update({
          promotion_stage: "active",
          activated_at: new Date().toISOString(),
        })
        .eq("id", record_id)
        .select()
        .single();

      if (uErr) throw uErr;

      return new Response(JSON.stringify({ record: updated, message: "Canon record activated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── deprecate_record ─── */
    if (action === "deprecate_record") {
      const { record_id, review_notes } = body;
      if (!record_id) {
        return new Response(JSON.stringify({ error: "record_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: record, error: rErr } = await supabase
        .from("canon_learning_records")
        .select("*")
        .eq("id", record_id)
        .eq("organization_id", orgId)
        .single();

      if (rErr || !record) {
        return new Response(JSON.stringify({ error: "Record not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!validateStageTransition(record.promotion_stage as PromotionStage, "deprecated")) {
        return new Response(JSON.stringify({ error: `Cannot deprecate from '${record.promotion_stage}'. Must be 'active'.` }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updated, error: uErr } = await supabase
        .from("canon_learning_records")
        .update({
          promotion_stage: "deprecated",
          deprecated_at: new Date().toISOString(),
          review_notes: review_notes || record.review_notes,
        })
        .eq("id", record_id)
        .select()
        .single();

      if (uErr) throw uErr;

      return new Response(JSON.stringify({ record: updated, message: "Canon record deprecated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── list_canon_records ─── */
    if (action === "list_canon_records") {
      const { stage_filter, approval_filter } = body;

      let query = supabase
        .from("canon_learning_records")
        .select("*, learning_candidates(*)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (stage_filter) query = query.eq("promotion_stage", stage_filter);
      if (approval_filter) query = query.eq("approval_status", approval_filter);

      const { data, error } = await query.limit(200);
      if (error) throw error;

      return new Response(JSON.stringify({ records: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── canon_summary ─── */
    if (action === "canon_summary") {
      const { data: records, error } = await supabase
        .from("canon_learning_records")
        .select("promotion_stage, approval_status, confidence_score, activated_at, deprecated_at, created_at")
        .eq("organization_id", orgId);

      if (error) throw error;

      const byStage: Record<string, number> = {};
      const byApproval: Record<string, number> = {};
      let recentPromotions = 0;
      let recentDeprecations = 0;
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      for (const r of (records || [])) {
        byStage[r.promotion_stage] = (byStage[r.promotion_stage] || 0) + 1;
        byApproval[r.approval_status] = (byApproval[r.approval_status] || 0) + 1;
        if (r.activated_at && r.activated_at >= oneWeekAgo) recentPromotions++;
        if (r.deprecated_at && r.deprecated_at >= oneWeekAgo) recentDeprecations++;
      }

      return new Response(JSON.stringify({
        total: (records || []).length,
        by_stage: byStage,
        by_approval: byApproval,
        recent_promotions: recentPromotions,
        recent_deprecations: recentDeprecations,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
