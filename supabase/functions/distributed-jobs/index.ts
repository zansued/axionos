import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, requireOrgMembership } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authResult = await authenticate(req);
    if (authResult instanceof Response) return authResult;
    const { serviceClient } = authResult;

    const { action, organization_id, job_id } = await req.json();
    if (!organization_id) return errorResponse("organization_id required", 400);

    switch (action) {
      case "overview": {
        const [{ data: jobs }, { data: events }] = await Promise.all([
          serviceClient.from("distributed_jobs").select("*").eq("organization_id", organization_id).limit(500),
          serviceClient.from("distributed_job_events").select("*").eq("organization_id", organization_id).limit(500),
        ]);

        const all = jobs || [];
        const active = all.filter((j: any) => ["queued", "assigned", "running", "paused", "retrying"].includes(j.status)).length;
        const queued = all.filter((j: any) => j.status === "queued").length;
        const running = all.filter((j: any) => j.status === "running").length;
        const paused = all.filter((j: any) => j.status === "paused").length;
        const retrying = all.filter((j: any) => j.status === "retrying").length;
        const completed = all.filter((j: any) => j.status === "completed").length;
        const failed = all.filter((j: any) => j.status === "failed").length;
        const aborted = all.filter((j: any) => j.status === "aborted").length;
        const totalRetries = all.reduce((s: number, j: any) => s + (j.retry_count || 0), 0);
        const byPriority: Record<number, number> = {};
        all.forEach((j: any) => { byPriority[j.priority] = (byPriority[j.priority] || 0) + 1; });

        return jsonResponse({
          total: all.length, active, queued, running, paused, retrying,
          completed, failed, aborted, total_retries: totalRetries,
          total_events: (events || []).length, by_priority: byPriority,
        });
      }

      case "list_jobs": {
        const { data: jobs } = await serviceClient
          .from("distributed_jobs")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(200);
        return jsonResponse({ jobs: jobs || [] });
      }

      case "job_detail": {
        if (!job_id) return errorResponse("job_id required", 400);
        const [{ data: job }, { data: assignments }, { data: dependencies }, { data: events }] = await Promise.all([
          serviceClient.from("distributed_jobs").select("*").eq("id", job_id).maybeSingle(),
          serviceClient.from("distributed_job_assignments").select("*").eq("job_id", job_id).order("assigned_at", { ascending: false }),
          serviceClient.from("distributed_job_dependencies").select("*, distributed_jobs!distributed_job_dependencies_depends_on_job_id_fkey(job_label, status)").eq("job_id", job_id),
          serviceClient.from("distributed_job_events").select("*").eq("job_id", job_id).order("created_at", { ascending: false }),
        ]);
        if (!job) return errorResponse("Job not found", 404);
        return jsonResponse({ job, assignments: assignments || [], dependencies: dependencies || [], events: events || [] });
      }

      case "explain_job_state": {
        if (!job_id) return errorResponse("job_id required", 400);
        const { data: job } = await serviceClient.from("distributed_jobs").select("*").eq("id", job_id).maybeSingle();
        if (!job) return errorResponse("Job not found", 404);

        const { data: deps } = await serviceClient.from("distributed_job_dependencies").select("*, distributed_jobs!distributed_job_dependencies_depends_on_job_id_fkey(job_label, status)").eq("job_id", job_id);
        const { data: events } = await serviceClient.from("distributed_job_events").select("*").eq("job_id", job_id).order("created_at", { ascending: false }).limit(10);

        const explanations: string[] = [];
        if (job.status === "queued") explanations.push("Job is waiting in the queue for assignment.");
        if (job.status === "assigned") explanations.push("Job has been assigned to a target but has not started executing.");
        if (job.status === "running") explanations.push("Job is currently executing.");
        if (job.status === "paused") explanations.push("Job has been paused by an operator or control-plane rule.");
        if (job.status === "retrying") explanations.push(`Job is being retried (attempt ${job.retry_count} of ${job.max_retries}).`);
        if (job.status === "completed") explanations.push("Job completed successfully.");
        if (job.status === "failed") explanations.push(`Job failed: ${job.fail_reason || "no reason recorded"}.`);
        if (job.status === "aborted") explanations.push(`Job was aborted: ${job.abort_reason || "no reason recorded"}.`);

        const blockedDeps = (deps || []).filter((d: any) => d.distributed_jobs?.status && !["completed"].includes(d.distributed_jobs.status));
        if (blockedDeps.length > 0) explanations.push(`${blockedDeps.length} dependency/dependencies not yet completed — may block progress.`);

        return jsonResponse({
          job_label: job.job_label,
          status: job.status,
          priority: job.priority,
          routing_target: job.routing_target,
          explanations,
          blocked_dependencies: blockedDeps.length,
          recent_events: (events || []).length,
          safety_note: "Job control is advisory-first. No autonomous structural mutation from job orchestration.",
        });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    return errorResponse(String(err), 500);
  }
});
