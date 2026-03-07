import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import {
  generateCalibrationSignals,
  generateCalibrationSummary,
} from "../_shared/calibration/analysis-service.ts";

/**
 * advisory-calibration-engine — Sprint 20
 *
 * Actions:
 *   generate_signals   — Analyze and generate calibration signals
 *   get_signals        — List calibration signals
 *   generate_summary   — Generate calibration summary report
 *   get_summaries      — List calibration summaries
 *   get_observability  — Full calibration observability metrics
 *
 * SAFETY: Read-only analytics + advisory signal writes. Never mutates agents or behavior.
 */

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient: sc } = auth as AuthContext;

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) return errorResponse("organization_id required", 400);

    // ─── GENERATE SIGNALS ───
    if (action === "generate_signals") {
      const result = await generateCalibrationSignals(sc, user.id, organization_id, body.workspace_id);
      return jsonResponse({ ...result, generated_at: new Date().toISOString() });
    }

    // ─── GET SIGNALS ───
    if (action === "get_signals") {
      let query = sc
        .from("advisory_calibration_signals")
        .select("*")
        .eq("organization_id", organization_id)
        .order("signal_strength", { ascending: false })
        .limit(body.limit || 50);

      if (body.calibration_domain) query = query.eq("calibration_domain", body.calibration_domain);
      if (body.signal_type) query = query.eq("signal_type", body.signal_type);
      if (body.target_component) query = query.eq("target_component", body.target_component);

      const { data } = await query;
      return jsonResponse({ signals: data || [], total: (data || []).length });
    }

    // ─── GENERATE SUMMARY ───
    if (action === "generate_summary") {
      if (!body.period_start || !body.period_end) {
        return errorResponse("period_start and period_end required", 400);
      }
      const result = await generateCalibrationSummary(
        sc, user.id, organization_id,
        body.period_start, body.period_end, body.workspace_id,
      );
      return jsonResponse(result);
    }

    // ─── GET SUMMARIES ───
    if (action === "get_summaries") {
      const { data } = await sc
        .from("advisory_calibration_summaries")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(body.limit || 20);
      return jsonResponse({ summaries: data || [] });
    }

    // ─── GET OBSERVABILITY ───
    if (action === "get_observability") {
      const { data: signals } = await sc
        .from("advisory_calibration_signals")
        .select("calibration_domain, signal_type, target_component, signal_strength, confidence_score, risk_of_overcorrection, title, created_at")
        .eq("organization_id", organization_id)
        .order("signal_strength", { ascending: false })
        .limit(200);

      const all = (signals || []) as any[];
      const byDomain: Record<string, { count: number; avg_strength: number; signals: any[] }> = {};

      for (const s of all) {
        if (!byDomain[s.calibration_domain]) byDomain[s.calibration_domain] = { count: 0, avg_strength: 0, signals: [] };
        byDomain[s.calibration_domain].count++;
        byDomain[s.calibration_domain].avg_strength += Number(s.signal_strength);
        if (byDomain[s.calibration_domain].signals.length < 3) byDomain[s.calibration_domain].signals.push(s);
      }
      for (const k of Object.keys(byDomain)) {
        byDomain[k].avg_strength = Math.round((byDomain[k].avg_strength / byDomain[k].count) * 1000) / 1000;
      }

      const { data: summaries } = await sc
        .from("advisory_calibration_summaries")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(5);

      return jsonResponse({
        total_signals: all.length,
        by_domain: byDomain,
        strongest_signals: all.slice(0, 10),
        avg_signal_strength: all.length > 0
          ? Math.round(all.reduce((a, s) => a + Number(s.signal_strength), 0) / all.length * 1000) / 1000
          : 0,
        avg_confidence: all.length > 0
          ? Math.round(all.reduce((a, s) => a + Number(s.confidence_score), 0) / all.length * 1000) / 1000
          : 0,
        recent_summaries: summaries || [],
      });
    }

    return errorResponse("Invalid action. Use: generate_signals, get_signals, generate_summary, get_summaries, get_observability", 400);
  } catch (e) {
    console.error("advisory-calibration-engine error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
