/**
 * Sprint 97 — Bounded Autonomous Operations
 * Block T: Governed Intelligence OS
 *
 * Actions: list, detail, explain, evaluate, execute, rollback, block, stats
 *
 * Invariants: advisory-first, bounded autonomy, rollback everywhere, tenant isolation, auditable
 *
 * Sprint 198: Hardened with auth + org validation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { resolveAndValidateOrg, logSecurityAudit } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await authenticateWithRateLimit(req, "autonomous-ops");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const body = await req.json();
    const { action, organization_id: payloadOrgId } = body;

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organization_id) {
      return errorResponse(orgError || "Organization access denied", 403);
    }

    await logSecurityAudit(supabase, {
      organization_id,
      actor_id: user.id,
      function_name: "autonomous-ops",
      action: action || "unknown",
    });

    const json = (data: any, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ─── LIST ─────────────────────────────────────────────────────────
    if (action === "list") {
      const f = body.filters || {};
      let query = supabase
        .from("autonomous_operations")
        .select("*")
        .eq("organization_id", organization_id)
        .order("updated_at", { ascending: false })
        .limit(f.limit || 50);

      if (f.status) query = query.eq("status", f.status);
      if (f.operation_type) query = query.eq("operation_type", f.operation_type);
      if (f.autonomy_level) query = query.eq("autonomy_level", f.autonomy_level);

      const { data, error } = await query;
      if (error) throw error;
      return json({ operations: data });
    }

    // ─── DETAIL ───────────────────────────────────────────────────────
    if (action === "detail") {
      const { operation_id } = body;
      if (!operation_id) throw new Error("operation_id required");

      const [opRes, execsRes, reviewsRes] = await Promise.all([
        supabase.from("autonomous_operations").select("*, institutional_doctrines(id, doctrine_title, doctrine_type)")
          .eq("id", operation_id).eq("organization_id", organization_id).single(),
        supabase.from("autonomous_operation_executions").select("*")
          .eq("operation_id", operation_id).eq("organization_id", organization_id)
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("autonomous_operation_reviews").select("*")
          .eq("operation_id", operation_id).eq("organization_id", organization_id)
          .order("created_at", { ascending: false }).limit(20),
      ]);

      if (opRes.error) throw opRes.error;
      return json({ operation: opRes.data, executions: execsRes.data || [], reviews: reviewsRes.data || [] });
    }

    // ─── EXPLAIN ──────────────────────────────────────────────────────
    if (action === "explain") {
      const { operation_id } = body;
      if (!operation_id) throw new Error("operation_id required");

      const { data: op } = await supabase.from("autonomous_operations")
        .select("*, institutional_doctrines(doctrine_title, doctrine_type, recommendation_strength)")
        .eq("id", operation_id).eq("organization_id", organization_id).single();

      if (!op) throw new Error("Operation not found");

      const autonomyLabels: Record<string, string> = {
        recommend_only: "Recommendation only — no automatic execution",
        auto_execute_notify: "Auto-execute with notification — operator is informed",
        auto_execute_bounded: "Auto-execute within bounded policy — strict limits apply",
        requires_approval: "Requires human approval before execution",
      };

      const rollbackLabels: Record<string, string> = {
        not_applicable: "Rollback not applicable for this operation type",
        manual_rollback: "Manual rollback available — operator can revert",
        auto_rollback_available: "Automatic rollback available if regression detected",
        auto_rolled_back: "Operation was automatically rolled back",
      };

      return json({
        explanation: {
          what_was_done: `${op.operation_title}: ${op.operation_description}`,
          why_allowed: op.institutional_doctrines
            ? `Governed by doctrine: "${op.institutional_doctrines.doctrine_title}" (${op.institutional_doctrines.recommendation_strength?.replace(/_/g, " ")})`
            : "Governed by operation rule policy",
          autonomy_posture: autonomyLabels[op.autonomy_level] || op.autonomy_level,
          rollback_posture: rollbackLabels[op.rollback_posture] || op.rollback_posture,
          risk_assessment: {
            risk_score: op.risk_score,
            confidence: op.confidence_score,
            interpretation: op.risk_score <= 0.2 ? "Very low risk" : op.risk_score <= 0.4 ? "Low risk" : op.risk_score <= 0.6 ? "Moderate risk" : "Elevated risk — review recommended",
          },
          what_not_automated: "Structural changes, architecture mutations, governance policy changes, and high-risk operations always require human approval.",
          scope: op.execution_scope,
          trigger: op.trigger_condition,
        },
      });
    }

    // ─── EVALUATE ─────────────────────────────────────────────────────
    if (action === "evaluate") {
      const input = body.evaluation_input;
      if (!input) throw new Error("evaluation_input required");

      // Find matching rules
      const { data: rules } = await supabase.from("autonomous_operation_rules")
        .select("*").eq("organization_id", organization_id)
        .eq("operation_type", input.operation_type).eq("enabled", true)
        .order("required_confidence", { ascending: false });

      const matchingRule = (rules || []).find((r: any) =>
        input.confidence_score >= r.required_confidence && input.risk_score <= r.max_risk_score
      );

      const autonomyLevel = matchingRule ? matchingRule.autonomy_level : "recommend_only";
      const blocked = input.risk_score > 0.7;

      // Create operation record
      const { data: op, error: insertErr } = await supabase.from("autonomous_operations").insert({
        organization_id,
        workspace_id: body.workspace_id || null,
        operation_key: `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        operation_title: input.operation_title,
        operation_description: input.operation_description || "",
        operation_type: input.operation_type,
        execution_scope: input.execution_scope || "workspace",
        trigger_condition: input.trigger_condition || {},
        governing_doctrine_id: matchingRule?.governing_doctrine_id || null,
        governing_rule_id: matchingRule?.id || null,
        autonomy_level: blocked ? "requires_approval" : autonomyLevel,
        approval_posture: blocked ? "blocked" : autonomyLevel === "requires_approval" ? "awaiting_approval" : "advisory",
        rollback_posture: input.rollback_posture || "not_applicable",
        status: blocked ? "blocked" : autonomyLevel === "recommend_only" ? "pending" : "approved",
        confidence_score: input.confidence_score || 0.5,
        risk_score: input.risk_score || 0.1,
        audit_metadata: { evaluated_by: "autonomous-ops-engine", version: "97.0", rule_id: matchingRule?.id || null },
      }).select().single();

      if (insertErr) throw insertErr;

      // Update rule trigger count
      if (matchingRule) {
        await supabase.from("autonomous_operation_rules")
          .update({ times_triggered: matchingRule.times_triggered + 1, updated_at: new Date().toISOString() })
          .eq("id", matchingRule.id);
      }

      return json({ operation: op, matched_rule: matchingRule?.id || null, autonomy_level: op.autonomy_level });
    }

    // ─── EXECUTE ──────────────────────────────────────────────────────
    if (action === "execute") {
      const { operation_id } = body;
      if (!operation_id) throw new Error("operation_id required");

      const { data: op } = await supabase.from("autonomous_operations")
        .select("*").eq("id", operation_id).eq("organization_id", organization_id).single();

      if (!op) throw new Error("Operation not found");
      if (op.status === "blocked") throw new Error("Operation is blocked — requires review");
      if (op.autonomy_level === "requires_approval" && op.status !== "approved") {
        throw new Error("Operation requires approval before execution");
      }

      const startTime = Date.now();

      // Simulate bounded execution (in production this dispatches to actual handlers)
      const executionOutput = {
        action_taken: op.operation_type,
        scope: op.execution_scope,
        timestamp: new Date().toISOString(),
        bounded: true,
        reversible: op.rollback_posture !== "not_applicable",
      };

      const duration = Date.now() - startTime;

      // Record execution
      await supabase.from("autonomous_operation_executions").insert({
        organization_id,
        operation_id,
        rule_id: op.governing_rule_id || null,
        execution_type: op.autonomy_level === "recommend_only" ? "manual" : "auto",
        execution_input: op.trigger_condition,
        execution_output: executionOutput,
        success: true,
        duration_ms: duration,
        rollback_available: op.rollback_posture !== "not_applicable",
      });

      // Update operation status
      await supabase.from("autonomous_operations").update({
        status: "completed",
        execution_result: executionOutput,
        executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", operation_id);

      return json({ success: true, execution: executionOutput });
    }

    // ─── ROLLBACK ─────────────────────────────────────────────────────
    if (action === "rollback") {
      const { operation_id } = body;
      if (!operation_id) throw new Error("operation_id required");

      const { data: op } = await supabase.from("autonomous_operations")
        .select("*").eq("id", operation_id).eq("organization_id", organization_id).single();

      if (!op) throw new Error("Operation not found");
      if (op.rollback_posture === "not_applicable") throw new Error("Rollback not available for this operation");

      await supabase.from("autonomous_operations").update({
        status: "rolled_back",
        rollback_posture: "auto_rolled_back",
        rolled_back_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", operation_id);

      // Mark executions as rolled back
      await supabase.from("autonomous_operation_executions")
        .update({ rollback_executed: true })
        .eq("operation_id", operation_id);

      return json({ success: true, rolled_back: true });
    }

    // ─── BLOCK ────────────────────────────────────────────────────────
    if (action === "block") {
      const { operation_id } = body;
      if (!operation_id) throw new Error("operation_id required");

      await supabase.from("autonomous_operations").update({
        status: "blocked",
        approval_posture: "blocked",
        updated_at: new Date().toISOString(),
        audit_metadata: { blocked_by: "operator", blocked_at: new Date().toISOString() },
      }).eq("id", operation_id).eq("organization_id", organization_id);

      return json({ success: true });
    }

    // ─── STATS ────────────────────────────────────────────────────────
    if (action === "stats") {
      const { data: all } = await supabase.from("autonomous_operations")
        .select("id, status, autonomy_level, operation_type, risk_score, rollback_posture")
        .eq("organization_id", organization_id);

      const ops = all || [];
      const byStatus: Record<string, number> = {};
      const byAutonomy: Record<string, number> = {};
      const byType: Record<string, number> = {};

      for (const o of ops) {
        byStatus[o.status] = (byStatus[o.status] || 0) + 1;
        byAutonomy[o.autonomy_level] = (byAutonomy[o.autonomy_level] || 0) + 1;
        byType[o.operation_type] = (byType[o.operation_type] || 0) + 1;
      }

      return json({
        stats: {
          total: ops.length,
          completed: ops.filter((o: any) => o.status === "completed").length,
          blocked: ops.filter((o: any) => o.status === "blocked").length,
          rolled_back: ops.filter((o: any) => o.status === "rolled_back").length,
          pending: ops.filter((o: any) => o.status === "pending").length,
          auto_executed: ops.filter((o: any) => ["auto_execute_notify", "auto_execute_bounded"].includes(o.autonomy_level)).length,
          requires_approval: ops.filter((o: any) => o.autonomy_level === "requires_approval").length,
          by_status: byStatus,
          by_autonomy: byAutonomy,
          by_type: byType,
        },
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("autonomous-ops error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
