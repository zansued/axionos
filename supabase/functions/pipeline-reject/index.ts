import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, updateInitiative, createJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-reject");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, body } = result;

  const { comment = "" } = body;
  const currentStatus = initiative.stage_status;

  // Check gate permission
  const { data: hasPermission } = await serviceClient.rpc("has_gate_permission", {
    _user_id: ctx.userId,
    _org_id: ctx.organizationId,
    _stage: currentStatus,
    _action_type: "reject",
  });

  if (hasPermission === false) {
    return errorResponse("Você não tem permissão para rejeitar neste gate. Contate um administrador.", 403);
  }

  const rollbackMap: Record<string, { rollbackTo: string; stageLabel: string }> = {
    discovered: { rollbackTo: "draft", stageLabel: "Discovery" },
    architected: { rollbackTo: "architecture_ready", stageLabel: "Arquitetura" },
    architecture_simulated: { rollbackTo: "architected", stageLabel: "Simulação" },
    architecture_validated: { rollbackTo: "architecture_simulated", stageLabel: "Validação Preventiva" },
    bootstrapped: { rollbackTo: "architecture_validated", stageLabel: "Bootstrap Intelligence" },
    scaffolded: { rollbackTo: "bootstrapped", stageLabel: "Scaffold" },
    modules_simulated: { rollbackTo: "scaffolded", stageLabel: "Module Graph" },
    squad_formed: { rollbackTo: "modules_simulated", stageLabel: "Squad" },
    planned: { rollbackTo: "planning_ready", stageLabel: "Planning" },
    in_progress: { rollbackTo: "planned", stageLabel: "Execução" },
    validating: { rollbackTo: "in_progress", stageLabel: "Validação" },
    ready_to_publish: { rollbackTo: "validating", stageLabel: "Publicação" },
  };

  const rollback = rollbackMap[currentStatus];
  if (!rollback) {
    return errorResponse(`Cannot reject at status: ${currentStatus}`, 400);
  }

  const jobId = await createJob(ctx, "reject", { current_status: currentStatus, comment: comment.trim() });
  await updateInitiative(ctx, { stage_status: rollback.rollbackTo });

  // If rejecting execution/validation, reset subtasks
  if (["in_progress", "validating", "ready_to_publish"].includes(currentStatus)) {
    const { data: stories } = await serviceClient.from("stories")
      .select("id").eq("initiative_id", ctx.initiativeId);

    if (stories && stories.length > 0) {
      const storyIds = stories.map((s: any) => s.id);
      const { data: phases } = await serviceClient.from("story_phases")
        .select("id").in("story_id", storyIds);

      if (phases && phases.length > 0) {
        const phaseIds = phases.map((p: any) => p.id);
        const { data: subtasks } = await serviceClient.from("story_subtasks")
          .select("id").in("phase_id", phaseIds).eq("status", "completed");

        if (subtasks && subtasks.length > 0) {
          const subtaskIds = subtasks.map((st: any) => st.id);
          await serviceClient.from("agent_outputs")
            .update({ status: "rejected" })
            .in("subtask_id", subtaskIds)
            .eq("organization_id", ctx.organizationId);

          await serviceClient.from("story_subtasks")
            .update({ status: "pending", output: null, executed_at: null, executed_by_agent_id: null })
            .in("phase_id", phaseIds);

          await serviceClient.from("story_phases")
            .update({ status: "pending" })
            .in("story_id", storyIds);

          await serviceClient.from("stories")
            .update({ status: "todo" })
            .in("id", storyIds);
        }
      }
    }
  }

  if (jobId) {
    await serviceClient.from("initiative_jobs").update({
      status: "success",
      outputs: { action: "rework_requested", comment: comment.trim(), rollback_to: rollback.rollbackTo },
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);
  }

  await pipelineLog(ctx, "pipeline_stage_rejected", `Ajustes solicitados em ${rollback.stageLabel}: ${comment.trim().slice(0, 200)}`, {
    previous_status: currentStatus, rollback_to: rollback.rollbackTo, comment: comment.trim(),
  });

  return jsonResponse({
    success: true, action: "rework_requested",
    previous_status: currentStatus, new_status: rollback.rollbackTo, job_id: jobId,
  });
});
