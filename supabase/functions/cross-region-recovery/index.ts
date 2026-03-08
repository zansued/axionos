import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authResult = await authenticate(req);
    if (authResult instanceof Response) return authResult;
    const { serviceClient } = authResult;

    const { action, organization_id, posture_id } = await req.json();
    if (!organization_id) return errorResponse("organization_id required", 400);

    switch (action) {
      case "overview": {
        const [{ data: postures }, { data: signals }, { data: decisions }] = await Promise.all([
          serviceClient.from("region_execution_postures").select("*").eq("organization_id", organization_id).limit(500),
          serviceClient.from("region_health_signals").select("*").eq("organization_id", organization_id).limit(500),
          serviceClient.from("region_failover_decisions").select("*").eq("organization_id", organization_id).limit(200),
        ]);
        const all = postures || [];
        const healthy = all.filter((p: any) => p.recovery_status === "healthy").length;
        const degraded = all.filter((p: any) => p.recovery_status === "degraded").length;
        const recovering = all.filter((p: any) => p.recovery_status === "recovering").length;
        const recovered = all.filter((p: any) => p.recovery_status === "recovered").length;
        const failed = all.filter((p: any) => p.recovery_status === "failed").length;
        const activeFailovers = (decisions || []).filter((d: any) => d.decision_status === "active").length;
        const criticalSignals = (signals || []).filter((s: any) => s.severity === "critical").length;

        return jsonResponse({
          total_postures: all.length, healthy, degraded, recovering, recovered, failed,
          total_signals: (signals || []).length, critical_signals: criticalSignals,
          total_decisions: (decisions || []).length, active_failovers: activeFailovers,
        });
      }

      case "list_region_postures": {
        const { data } = await serviceClient.from("region_execution_postures").select("*")
          .eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        return jsonResponse({ postures: data || [] });
      }

      case "list_region_health": {
        const { data } = await serviceClient.from("region_health_signals").select("*")
          .eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        return jsonResponse({ signals: data || [] });
      }

      case "region_detail": {
        if (!posture_id) return errorResponse("posture_id required", 400);
        const [{ data: posture }, { data: decisions }, { data: events }] = await Promise.all([
          serviceClient.from("region_execution_postures").select("*").eq("id", posture_id).maybeSingle(),
          serviceClient.from("region_failover_decisions").select("*").eq("posture_id", posture_id).order("created_at", { ascending: false }),
          serviceClient.from("region_recovery_events").select("*").eq("posture_id", posture_id).order("created_at", { ascending: false }),
        ]);
        if (!posture) return errorResponse("Not found", 404);
        return jsonResponse({ posture, decisions: decisions || [], events: events || [] });
      }

      case "explain_recovery": {
        if (!posture_id) return errorResponse("posture_id required", 400);
        const { data: posture } = await serviceClient.from("region_execution_postures").select("*").eq("id", posture_id).maybeSingle();
        if (!posture) return errorResponse("Not found", 404);
        const { data: decisions } = await serviceClient.from("region_failover_decisions").select("*").eq("posture_id", posture_id);

        const explanations: string[] = [];
        if (posture.recovery_status === "healthy") explanations.push("Region is healthy — no recovery needed.");
        if (posture.recovery_status === "degraded") explanations.push("Regional degradation detected — recovery may be recommended.");
        if (posture.recovery_status === "recovering") explanations.push("Recovery in progress — workload is being rerouted.");
        if (posture.recovery_status === "recovered") explanations.push("Recovery completed — execution continuity was preserved.");
        if (posture.recovery_status === "failed") explanations.push("Recovery failed — manual intervention may be required.");
        if (posture.continuity_confidence < 0.5) explanations.push("Low continuity confidence — significant risk of disruption.");
        if (posture.trade_off_notes) explanations.push(`Trade-off: ${posture.trade_off_notes}`);
        if ((decisions || []).length > 0) explanations.push(`${(decisions || []).length} failover decision(s) recorded.`);

        return jsonResponse({
          primary_region: posture.primary_region,
          recovery_status: posture.recovery_status,
          continuity_confidence: posture.continuity_confidence,
          explanations,
          safety_note: "Cross-region recovery is advisory-first. No autonomous structural mutation.",
        });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    return errorResponse(String(err), 500);
  }
});
