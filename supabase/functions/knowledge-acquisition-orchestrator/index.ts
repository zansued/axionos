import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_CONCURRENT = 3;
const MAX_ITEMS_PER_RUN = 10;
const MAX_RETRIES = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const sc = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, organizationId } = body;
    if (!organizationId) throw new Error("organizationId required");

    const { data: membership } = await sc.from("organization_members").select("id").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
    if (!membership) throw new Error("Not a member of this organization");

    let result: any;
    switch (action) {
      case "enqueue_plan": result = await enqueuePlan(sc, organizationId, body); break;
      case "execute_next": result = await executeNext(sc, organizationId); break;
      case "list_jobs": result = await listJobs(sc, organizationId, body); break;
      case "job_detail": result = await jobDetail(sc, organizationId, body.jobId); break;
      case "cancel_job": result = await cancelJob(sc, organizationId, body.jobId); break;
      case "retry_job": result = await retryJob(sc, organizationId, body.jobId); break;
      case "pause_all": result = await pauseAll(sc, organizationId); break;
      case "resume_all": result = await resumeAll(sc, organizationId); break;
      case "overview": result = await overview(sc, organizationId); break;
      default: throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function enqueuePlan(sc: any, orgId: string, body: any) {
  const { planId } = body;
  if (!planId) throw new Error("planId required");

  const { data: plan } = await sc.from("knowledge_acquisition_plans").select("*").eq("id", planId).eq("organization_id", orgId).maybeSingle();
  if (!plan) throw new Error("Plan not found");
  if (!["approved_for_acquisition", "proposed"].includes(plan.status)) throw new Error("Plan must be approved or proposed to enqueue");

  // Budget check
  const budgetOk = await checkBudget(sc, orgId, plan.expected_cost || 0);
  const budgetStatus = budgetOk ? "within_budget" : "budget_blocked";

  const sources = (plan.source_refs || []) as string[];
  const jobs: any[] = [];

  for (const src of sources.length > 0 ? sources : [plan.target_scope]) {
    jobs.push({
      organization_id: orgId,
      plan_id: planId,
      source_ref: src,
      source_type: "domain_expansion",
      execution_mode: plan.strategy_mode || "single_source",
      priority: plan.priority || "medium",
      status: budgetOk ? "queued" : "budget_blocked",
      estimated_cost: (plan.expected_cost || 0) / Math.max(1, sources.length),
      budget_status: budgetStatus,
    });
  }

  const { data: inserted, error } = await sc.from("knowledge_acquisition_jobs").insert(jobs).select();
  if (error) throw error;

  // Log events
  for (const job of inserted || []) {
    await logEvent(sc, orgId, job.id, "job_queued", `Job queued from plan: ${plan.plan_name}`);
  }

  // Update plan status
  await sc.from("knowledge_acquisition_plans").update({ status: "queued", updated_at: new Date().toISOString() }).eq("id", planId);

  return { jobs_created: (inserted || []).length, budget_status: budgetStatus };
}

async function executeNext(sc: any, orgId: string) {
  // Check concurrency
  const { data: running } = await sc.from("knowledge_acquisition_jobs").select("id").eq("organization_id", orgId).eq("status", "in_progress");
  const runningCount = (running || []).length;
  if (runningCount >= MAX_CONCURRENT) {
    return { executed: 0, reason: "max_concurrency_reached", running: runningCount };
  }

  const slotsAvailable = Math.min(MAX_CONCURRENT - runningCount, MAX_ITEMS_PER_RUN);

  // Get next queued jobs by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const { data: queued } = await sc.from("knowledge_acquisition_jobs")
    .select("*").eq("organization_id", orgId).eq("status", "queued")
    .order("created_at", { ascending: true }).limit(slotsAvailable * 2);

  if (!queued || queued.length === 0) return { executed: 0, reason: "no_queued_jobs" };

  // Sort by priority
  queued.sort((a: any, b: any) => (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 2));

  const toExecute = queued.slice(0, slotsAvailable);
  let executed = 0;

  for (const job of toExecute) {
    // Budget re-check
    const budgetOk = await checkBudget(sc, orgId, job.estimated_cost || 0);
    if (!budgetOk) {
      await sc.from("knowledge_acquisition_jobs").update({ status: "budget_blocked", budget_status: "budget_blocked", updated_at: new Date().toISOString() }).eq("id", job.id);
      await logEvent(sc, orgId, job.id, "blocked_by_budget", "Execution blocked: budget exceeded");
      continue;
    }

    // Mark in_progress
    await sc.from("knowledge_acquisition_jobs").update({
      status: "in_progress", started_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    await logEvent(sc, orgId, job.id, "execution_started", `Executing: ${job.source_ref}`);

    // Simulate execution (in real system this would call deep-repo-absorber-engine)
    const candidatesGenerated = Math.floor(Math.random() * 15) + 1;
    const itemsAbsorbed = Math.floor(candidatesGenerated * 0.7);
    const actualCost = job.estimated_cost * (0.8 + Math.random() * 0.4);

    await sc.from("knowledge_acquisition_jobs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      candidates_generated: candidatesGenerated,
      items_absorbed: itemsAbsorbed,
      actual_cost: Math.round(actualCost * 100) / 100,
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);

    // Debit budget
    await debitBudget(sc, orgId, actualCost);
    await logEvent(sc, orgId, job.id, "execution_completed", `Completed: ${itemsAbsorbed} items absorbed, ${candidatesGenerated} candidates`);
    executed++;
  }

  return { executed, slots_available: slotsAvailable, queued_remaining: queued.length - executed };
}

async function listJobs(sc: any, orgId: string, body: any) {
  let q = sc.from("knowledge_acquisition_jobs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
  if (body.status) q = q.eq("status", body.status);
  const { data } = await q;
  return { jobs: data || [] };
}

async function jobDetail(sc: any, orgId: string, jobId: string) {
  if (!jobId) throw new Error("jobId required");
  const [{ data: job }, { data: events }] = await Promise.all([
    sc.from("knowledge_acquisition_jobs").select("*").eq("id", jobId).eq("organization_id", orgId).maybeSingle(),
    sc.from("knowledge_acquisition_events").select("*").eq("job_id", jobId).eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
  ]);
  if (!job) throw new Error("Job not found");
  return { job, events: events || [] };
}

async function cancelJob(sc: any, orgId: string, jobId: string) {
  if (!jobId) throw new Error("jobId required");
  const { data: job } = await sc.from("knowledge_acquisition_jobs").select("status").eq("id", jobId).eq("organization_id", orgId).maybeSingle();
  if (!job) throw new Error("Job not found");
  if (["completed", "cancelled"].includes(job.status)) throw new Error("Cannot cancel a finished job");

  await sc.from("knowledge_acquisition_jobs").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", jobId);
  await logEvent(sc, orgId, jobId, "manually_cancelled", "Job cancelled by operator");
  return { success: true };
}

async function retryJob(sc: any, orgId: string, jobId: string) {
  if (!jobId) throw new Error("jobId required");
  const { data: job } = await sc.from("knowledge_acquisition_jobs").select("*").eq("id", jobId).eq("organization_id", orgId).maybeSingle();
  if (!job) throw new Error("Job not found");
  if (job.status !== "failed" && job.status !== "budget_blocked") throw new Error("Can only retry failed or budget-blocked jobs");
  if (job.retry_count >= (job.max_retries || MAX_RETRIES)) throw new Error("Max retries exceeded");

  await sc.from("knowledge_acquisition_jobs").update({
    status: "queued", retry_count: (job.retry_count || 0) + 1, fail_reason: null, updated_at: new Date().toISOString(),
  }).eq("id", jobId);
  await logEvent(sc, orgId, jobId, "retry_scheduled", `Retry #${(job.retry_count || 0) + 1}`);
  return { success: true };
}

async function pauseAll(sc: any, orgId: string) {
  const { data } = await sc.from("knowledge_acquisition_jobs").update({ status: "blocked", updated_at: new Date().toISOString() })
    .eq("organization_id", orgId).in("status", ["queued", "scheduled"]).select("id");
  for (const j of data || []) await logEvent(sc, orgId, j.id, "paused", "Paused by operator (pause_all)");
  return { paused: (data || []).length };
}

async function resumeAll(sc: any, orgId: string) {
  const { data } = await sc.from("knowledge_acquisition_jobs").update({ status: "queued", updated_at: new Date().toISOString() })
    .eq("organization_id", orgId).eq("status", "blocked").select("id");
  for (const j of data || []) await logEvent(sc, orgId, j.id, "resumed", "Resumed by operator");
  return { resumed: (data || []).length };
}

async function overview(sc: any, orgId: string) {
  const { data: jobs } = await sc.from("knowledge_acquisition_jobs").select("*").eq("organization_id", orgId).limit(500);
  const all = jobs || [];
  const completed = all.filter((j: any) => j.status === "completed");
  const failed = all.filter((j: any) => j.status === "failed");

  const avgDuration = completed.length > 0
    ? completed.reduce((s: number, j: any) => s + (j.completed_at && j.started_at ? new Date(j.completed_at).getTime() - new Date(j.started_at).getTime() : 0), 0) / completed.length
    : 0;
  const avgCost = completed.length > 0
    ? completed.reduce((s: number, j: any) => s + (j.actual_cost || 0), 0) / completed.length
    : 0;
  const totalCandidates = all.reduce((s: number, j: any) => s + (j.candidates_generated || 0), 0);
  const totalAbsorbed = all.reduce((s: number, j: any) => s + (j.items_absorbed || 0), 0);
  const retryRate = all.length > 0 ? all.filter((j: any) => j.retry_count > 0).length / all.length : 0;
  const budgetBlockedRate = all.length > 0 ? all.filter((j: any) => j.budget_status === "budget_blocked").length / all.length : 0;

  const { data: budgets } = await sc.from("knowledge_acquisition_budgets").select("*").eq("organization_id", orgId);

  return {
    total: all.length,
    queued: all.filter((j: any) => j.status === "queued").length,
    in_progress: all.filter((j: any) => j.status === "in_progress").length,
    completed: completed.length,
    failed: failed.length,
    cancelled: all.filter((j: any) => j.status === "cancelled").length,
    blocked: all.filter((j: any) => j.status === "blocked").length,
    budget_blocked: all.filter((j: any) => j.status === "budget_blocked").length,
    avg_duration_ms: Math.round(avgDuration),
    avg_cost: Math.round(avgCost * 100) / 100,
    total_candidates: totalCandidates,
    total_absorbed: totalAbsorbed,
    retry_rate: Math.round(retryRate * 100) / 100,
    budget_blocked_rate: Math.round(budgetBlockedRate * 100) / 100,
    budgets: budgets || [],
  };
}

// --- Helpers ---

async function checkBudget(sc: any, orgId: string, cost: number): Promise<boolean> {
  const { data: budgets } = await sc.from("knowledge_acquisition_budgets").select("*").eq("organization_id", orgId);
  if (!budgets || budgets.length === 0) return true; // No budget = no limit
  for (const b of budgets) {
    if (b.budget_used + cost > b.budget_limit) return false;
  }
  return true;
}

async function debitBudget(sc: any, orgId: string, cost: number) {
  const { data: budgets } = await sc.from("knowledge_acquisition_budgets").select("*").eq("organization_id", orgId);
  if (!budgets || budgets.length === 0) return;
  // Debit from first matching budget
  const b = budgets[0];
  await sc.from("knowledge_acquisition_budgets").update({ budget_used: (b.budget_used || 0) + cost, updated_at: new Date().toISOString() }).eq("id", b.id);
}

async function logEvent(sc: any, orgId: string, jobId: string, eventType: string, message: string, metadata: any = {}) {
  await sc.from("knowledge_acquisition_events").insert({
    organization_id: orgId, job_id: jobId, event_type: eventType, message, metadata,
  });
}
