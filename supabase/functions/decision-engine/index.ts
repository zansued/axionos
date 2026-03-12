/**
 * Sprint 98 — Institutional Decision Engine
 * Block T: Governed Intelligence OS — Completion
 *
 * Actions: generate, list, detail, explain, review, defer, escalate, stats
 *
 * Invariants: advisory-first, governance before autonomy, tenant isolation, auditable, no structural mutation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = (data: any, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ─── LIST ─────────────────────────────────────────────────────────
    if (action === "list") {
      const f = body.filters || {};
      let query = supabase
        .from("institutional_decisions")
        .select("*")
        .eq("organization_id", organization_id)
        .order("updated_at", { ascending: false })
        .limit(f.limit || 50);

      if (f.status) query = query.eq("status", f.status);
      if (f.decision_class) query = query.eq("decision_class", f.decision_class);
      if (f.confidence_posture) query = query.eq("confidence_posture", f.confidence_posture);
      if (f.approval_posture) query = query.eq("approval_posture", f.approval_posture);

      const { data, error } = await query;
      if (error) throw error;
      return json({ decisions: data });
    }

    // ─── DETAIL ───────────────────────────────────────────────────────
    if (action === "detail") {
      const { decision_id } = body;
      if (!decision_id) throw new Error("decision_id required");

      const [decRes, signalsRes, reviewsRes, explRes] = await Promise.all([
        supabase.from("institutional_decisions").select("*")
          .eq("id", decision_id).eq("organization_id", organization_id).single(),
        supabase.from("decision_signal_links").select("*")
          .eq("decision_id", decision_id).eq("organization_id", organization_id)
          .order("contribution_weight", { ascending: false }),
        supabase.from("decision_reviews").select("*")
          .eq("decision_id", decision_id).eq("organization_id", organization_id)
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("decision_explanations").select("*")
          .eq("decision_id", decision_id).eq("organization_id", organization_id)
          .order("generated_at", { ascending: false }).limit(1),
      ]);

      if (decRes.error) throw decRes.error;
      return json({
        decision: decRes.data,
        signals: signalsRes.data || [],
        reviews: reviewsRes.data || [],
        explanation: explRes.data?.[0] || null,
      });
    }

    // ─── EXPLAIN ──────────────────────────────────────────────────────
    if (action === "explain") {
      const { decision_id } = body;
      if (!decision_id) throw new Error("decision_id required");

      const { data: dec } = await supabase.from("institutional_decisions")
        .select("*").eq("id", decision_id).eq("organization_id", organization_id).single();

      if (!dec) throw new Error("Decision not found");

      const { data: signals } = await supabase.from("decision_signal_links")
        .select("*").eq("decision_id", decision_id).eq("organization_id", organization_id);

      const confidenceLabels: Record<string, string> = {
        very_low: "Very low confidence — insufficient supporting evidence",
        low: "Low confidence — limited evidence, proceed with caution",
        moderate: "Moderate confidence — reasonable supporting evidence",
        high: "High confidence — strong supporting evidence",
        very_high: "Very high confidence — comprehensive institutional backing",
      };

      const approvalLabels: Record<string, string> = {
        advisory_only: "Advisory only — no action required, informational",
        suggested_approval: "Suggested approval — operator may accept without escalation",
        requires_review: "Requires review — operator should examine before acting",
        requires_approval: "Requires explicit approval — sensitive decision",
        escalate_to_admin: "Escalate to admin — structural or high-risk decision",
      };

      const tradeOffs = Array.isArray(dec.trade_offs) ? dec.trade_offs : [];

      const explanation = {
        summary: `${dec.decision_title}: ${dec.recommendation}`,
        rationale: dec.recommendation_rationale,
        why_recommended: `Based on ${dec.contributing_memory_count} institutional memories and ${dec.contributing_doctrine_count} doctrines, the decision engine recommends this action.`,
        contributing_signals: (signals || []).map((s: any) => ({
          type: s.signal_type,
          summary: s.signal_summary,
          weight: s.contribution_weight,
        })),
        trade_offs: tradeOffs,
        confidence: {
          posture: dec.confidence_posture,
          score: dec.confidence_score,
          interpretation: confidenceLabels[dec.confidence_posture] || dec.confidence_posture,
        },
        uncertainty: dec.uncertainty_notes || "No explicit uncertainties documented.",
        risk: {
          posture: dec.risk_posture,
          score: dec.risk_score,
          interpretation: dec.risk_score <= 0.2 ? "Low risk" : dec.risk_score <= 0.5 ? "Moderate risk" : "Elevated risk — review recommended",
        },
        approval: {
          posture: dec.approval_posture,
          interpretation: approvalLabels[dec.approval_posture] || dec.approval_posture,
        },
        escalation_recommended: dec.approval_posture === "escalate_to_admin" || dec.risk_score > 0.6,
      };

      // Store explanation
      await supabase.from("decision_explanations").insert({
        organization_id,
        decision_id,
        explanation_type: "full",
        explanation_content: explanation,
      });

      return json({ explanation });
    }

    // ─── GENERATE_FROM_METRIC_DEVIATION ──────────────────────────────
    if (action === "generate_from_metric_deviation") {
      const { metric_key, current_value, baseline_value, deviation_pct, stage, initiative_id } = body;
      if (!metric_key || deviation_pct === undefined) throw new Error("metric_key and deviation_pct required");

      // Classify deviation severity
      const absDev = Math.abs(deviation_pct);
      let severity: string;
      let suggestedMode: string;
      let triggerType: string;

      if (absDev >= 50) {
        severity = "critical"; suggestedMode = "approval_required"; triggerType = "runtime_degraded";
      } else if (absDev >= 30) {
        severity = "high"; suggestedMode = "approval_required"; triggerType = "runtime_degraded";
      } else if (absDev >= 15) {
        severity = "medium"; suggestedMode = "auto"; triggerType = "policy_violation";
      } else {
        severity = "low"; suggestedMode = "auto"; triggerType = "readiness_complete";
      }

      const intentId = `intent-metric-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const actionId = `action-metric-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Build ActionIntent record
      const description = `Metric deviation detected: ${metric_key} deviated ${deviation_pct.toFixed(1)}% from baseline (${baseline_value} → ${current_value})`;

      // Query active policy rules for constraints
      const { data: policyRules } = await supabase
        .from("active_prevention_rules")
        .select("id, rule_type, description, action_type, pipeline_stage")
        .eq("organization_id", organization_id)
        .eq("enabled", true)
        .eq("pipeline_stage", stage || "validation")
        .limit(10);

      const constraints = (policyRules || []).map((r: any) => ({
        source: "policy",
        key: r.rule_type,
        description: r.description,
      }));

      // Insert into action_registry_entries with policy-derived constraints
      const { data: actionEntry, error: aeError } = await supabase
        .from("action_registry_entries")
        .insert({
          organization_id,
          action_id: actionId,
          intent_id: intentId,
          trigger_id: `trigger-metric-${metric_key}`,
          trigger_type: triggerType,
          initiative_id: initiative_id || null,
          stage: stage || "validation",
          execution_mode: suggestedMode,
          status: suggestedMode === "approval_required" ? "pending" : "pending",
          risk_level: severity,
          description,
          reason: `Metric ${metric_key} exceeded deviation threshold (${deviation_pct.toFixed(1)}%)`,
          requires_approval: suggestedMode === "approval_required",
          constraints,
        })
        .select()
        .single();

      if (aeError) throw aeError;

      // Emit audit event
      await supabase.from("action_audit_events").insert({
        organization_id,
        action_id: actionId,
        event_type: "action.created_from_metric_deviation",
        new_status: "pending",
        reason: description,
        actor_type: "system",
      });

      return json({
        action: actionEntry,
        intent_id: intentId,
        metric_deviation: { metric_key, current_value, baseline_value, deviation_pct, severity },
        constraints_applied: constraints.length,
      });
    }

    // ─── GENERATE ─────────────────────────────────────────────────────
    if (action === "generate") {
      const input = body.generation_input;
      if (!input) throw new Error("generation_input required");

      // Gather supporting memories
      const { data: memories } = await supabase.from("institutional_memories")
        .select("id, memory_title, memory_type, confidence_score, reuse_potential")
        .eq("organization_id", organization_id)
        .eq("lifecycle_status", "active")
        .order("confidence_score", { ascending: false })
        .limit(10);

      // Gather supporting doctrines
      const { data: doctrines } = await supabase.from("institutional_doctrines")
        .select("id, doctrine_title, doctrine_type, confidence_score, recommendation_strength")
        .eq("organization_id", organization_id)
        .eq("lifecycle_status", "active")
        .order("confidence_score", { ascending: false })
        .limit(5);

      const memCount = memories?.length || 0;
      const docCount = doctrines?.length || 0;

      // Calculate aggregate confidence
      const memConfidence = memories?.reduce((s, m) => s + (m.confidence_score || 0), 0) / Math.max(memCount, 1);
      const docConfidence = doctrines?.reduce((s, d) => s + (d.confidence_score || 0), 0) / Math.max(docCount, 1);
      const avgConfidence = (memConfidence + docConfidence) / 2;

      // Determine confidence posture
      let confPosture = "moderate";
      if (avgConfidence >= 0.85) confPosture = "very_high";
      else if (avgConfidence >= 0.7) confPosture = "high";
      else if (avgConfidence >= 0.5) confPosture = "moderate";
      else if (avgConfidence >= 0.3) confPosture = "low";
      else confPosture = "very_low";

      // Determine approval posture based on risk
      const riskScore = input.risk_score || 0.2;
      let approvalPosture = "advisory_only";
      if (riskScore > 0.7) approvalPosture = "escalate_to_admin";
      else if (riskScore > 0.5) approvalPosture = "requires_approval";
      else if (riskScore > 0.3) approvalPosture = "requires_review";
      else if (avgConfidence >= 0.7) approvalPosture = "suggested_approval";

      const decisionKey = `dec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const { data: decision, error: insertErr } = await supabase.from("institutional_decisions").insert({
        organization_id,
        workspace_id: body.workspace_id || null,
        decision_key: decisionKey,
        decision_title: input.decision_title,
        decision_description: input.decision_description || "",
        decision_class: input.decision_class || "governance_recommendation",
        decision_context: input.decision_context || {},
        recommendation: input.recommendation || "",
        recommendation_rationale: input.recommendation_rationale || "Generated based on institutional memory and doctrine analysis.",
        confidence_posture: confPosture,
        confidence_score: avgConfidence,
        uncertainty_notes: input.uncertainty_notes || null,
        risk_posture: riskScore <= 0.3 ? "low" : riskScore <= 0.6 ? "moderate" : "high",
        risk_score: riskScore,
        approval_posture: approvalPosture,
        status: "pending",
        contributing_memory_count: memCount,
        contributing_doctrine_count: docCount,
        trade_offs: input.trade_offs || [],
        audit_metadata: { generated_by: "decision-engine", version: "98.0" },
      }).select().single();

      if (insertErr) throw insertErr;

      // Create signal links
      const signals: any[] = [];
      for (const m of memories || []) {
        signals.push({
          organization_id,
          decision_id: decision.id,
          signal_type: "memory",
          signal_source_id: m.id,
          signal_source_table: "institutional_memories",
          contribution_weight: m.confidence_score || 0.5,
          signal_summary: m.memory_title,
        });
      }
      for (const d of doctrines || []) {
        signals.push({
          organization_id,
          decision_id: decision.id,
          signal_type: "doctrine",
          signal_source_id: d.id,
          signal_source_table: "institutional_doctrines",
          contribution_weight: d.confidence_score || 0.5,
          signal_summary: d.doctrine_title,
        });
      }
      if (signals.length > 0) {
        await supabase.from("decision_signal_links").insert(signals);
      }

      return json({ decision, signals_created: signals.length });
    }

    // ─── REVIEW ───────────────────────────────────────────────────────
    if (action === "review") {
      const { decision_id } = body;
      const input = body.review_input;
      if (!decision_id || !input) throw new Error("decision_id and review_input required");

      const authHeader = req.headers.get("Authorization");
      let reviewerId = null;
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        reviewerId = user?.id || null;
      }

      await supabase.from("decision_reviews").insert({
        organization_id,
        decision_id,
        reviewer_id: reviewerId,
        review_action: input.review_action,
        review_notes: input.review_notes || "",
        outcome_alignment: input.outcome_alignment || null,
      });

      const statusMap: Record<string, string> = {
        accept: "accepted",
        reject: "rejected",
        defer: "deferred",
        escalate: "escalated",
      };
      const newStatus = statusMap[input.review_action] || "pending";

      await supabase.from("institutional_decisions").update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        resolved_at: ["accepted", "rejected"].includes(newStatus) ? new Date().toISOString() : null,
        resolved_by: ["accepted", "rejected"].includes(newStatus) ? reviewerId : null,
      }).eq("id", decision_id).eq("organization_id", organization_id);

      return json({ success: true, new_status: newStatus });
    }

    // ─── DEFER ────────────────────────────────────────────────────────
    if (action === "defer") {
      const { decision_id, defer_reason } = body;
      if (!decision_id) throw new Error("decision_id required");

      await supabase.from("institutional_decisions").update({
        status: "deferred",
        audit_metadata: { deferred_at: new Date().toISOString(), defer_reason: defer_reason || "Deferred by operator" },
        updated_at: new Date().toISOString(),
      }).eq("id", decision_id).eq("organization_id", organization_id);

      return json({ success: true });
    }

    // ─── ESCALATE ─────────────────────────────────────────────────────
    if (action === "escalate") {
      const { decision_id, escalation_reason } = body;
      if (!decision_id) throw new Error("decision_id required");

      await supabase.from("institutional_decisions").update({
        status: "escalated",
        escalation_reason: escalation_reason || "Escalated by operator",
        approval_posture: "escalate_to_admin",
        updated_at: new Date().toISOString(),
      }).eq("id", decision_id).eq("organization_id", organization_id);

      return json({ success: true });
    }

    // ─── STATS ────────────────────────────────────────────────────────
    if (action === "stats") {
      const { data: all } = await supabase.from("institutional_decisions")
        .select("id, status, decision_class, confidence_posture, approval_posture, confidence_score")
        .eq("organization_id", organization_id);

      const decisions = all || [];
      const byStatus: Record<string, number> = {};
      const byClass: Record<string, number> = {};
      const byConfidence: Record<string, number> = {};
      const byApproval: Record<string, number> = {};

      for (const d of decisions) {
        byStatus[d.status] = (byStatus[d.status] || 0) + 1;
        byClass[d.decision_class] = (byClass[d.decision_class] || 0) + 1;
        byConfidence[d.confidence_posture] = (byConfidence[d.confidence_posture] || 0) + 1;
        byApproval[d.approval_posture] = (byApproval[d.approval_posture] || 0) + 1;
      }

      return json({
        stats: {
          total: decisions.length,
          pending: byStatus["pending"] || 0,
          accepted: byStatus["accepted"] || 0,
          rejected: byStatus["rejected"] || 0,
          deferred: byStatus["deferred"] || 0,
          escalated: byStatus["escalated"] || 0,
          high_confidence: decisions.filter((d: any) => ["high", "very_high"].includes(d.confidence_posture)).length,
          by_status: byStatus,
          by_class: byClass,
          by_confidence: byConfidence,
          by_approval: byApproval,
        },
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("decision-engine error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
