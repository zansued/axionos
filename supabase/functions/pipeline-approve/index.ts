import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, updateInitiative } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-approve");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient } = result;

  const currentStatus = initiative.stage_status;

  // Check gate permission
  const { data: hasPermission } = await serviceClient.rpc("has_gate_permission", {
    _user_id: ctx.userId,
    _org_id: ctx.organizationId,
    _stage: currentStatus,
    _action_type: "approve",
  });

  if (hasPermission === false) {
    return errorResponse("Você não tem permissão para aprovar este gate. Contate um administrador.", 403);
  }

  const approvalMap: Record<string, { field: string; nextStatus: string }> = {
    discovered: { field: "approved_at_discovery", nextStatus: "architecture_ready" },
    scaffolded: { field: "approved_at_discovery", nextStatus: "simulating_modules" },
    modules_simulated: { field: "approved_at_discovery", nextStatus: "analyzing_dependencies" },
    dependencies_analyzed: { field: "approved_at_discovery", nextStatus: "squad_ready" },
    squad_formed: { field: "approved_at_squad", nextStatus: "planning_ready" },
    planned: { field: "approved_at_planning", nextStatus: "in_progress" },
    validating: { field: "approved_at_planning", nextStatus: "ready_to_publish" },
    ready_to_publish: { field: "approved_at_planning", nextStatus: "published" },
    published: { field: "approved_at_planning", nextStatus: "observability_ready" },
    observability_ready: { field: "approved_at_planning", nextStatus: "analytics_ready" },
    analytics_ready: { field: "approved_at_planning", nextStatus: "behavior_analyzed" },
    behavior_analyzed: { field: "approved_at_planning", nextStatus: "growth_optimized" },
    growth_optimized: { field: "approved_at_planning", nextStatus: "product_evolved" },
    product_evolved: { field: "approved_at_planning", nextStatus: "architecture_evolved" },
    architecture_evolved: { field: "approved_at_planning", nextStatus: "system_evolved" },
    portfolio_managed: { field: "approved_at_planning", nextStatus: "system_evolved" },
    system_evolved: { field: "approved_at_planning", nextStatus: "completed" },
  };

  const approval = approvalMap[currentStatus];
  if (!approval) {
    const terminalStates = ["published", "completed", "archived", "in_progress"];
    if (terminalStates.includes(currentStatus)) {
      return jsonResponse({ success: true, new_status: currentStatus, message: "Already approved/advanced" });
    }
    return errorResponse(`Cannot approve at status: ${currentStatus}`, 400);
  }

  await updateInitiative(ctx, {
    stage_status: approval.nextStatus,
    [approval.field]: new Date().toISOString(),
  });
  await pipelineLog(ctx, "pipeline_stage_approved", `Stage aprovado: ${currentStatus} → ${approval.nextStatus}`);

  return jsonResponse({ success: true, previous_status: currentStatus, new_status: approval.nextStatus });
});
