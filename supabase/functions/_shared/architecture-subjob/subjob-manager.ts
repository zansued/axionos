/**
 * Architecture Subjob Manager
 * Handles DB CRUD for subjobs with lifecycle state transitions.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ARCHITECTURE_SUBJOBS, SubjobRecord, SubjobStatus, SubjobDefinition } from "./types.ts";

export async function createSubjobs(
  client: SupabaseClient,
  jobId: string,
  initiativeId: string,
  organizationId: string,
): Promise<SubjobRecord[]> {
  const rows = ARCHITECTURE_SUBJOBS.map((def: SubjobDefinition) => ({
    job_id: jobId,
    initiative_id: initiativeId,
    organization_id: organizationId,
    subjob_key: def.key,
    stage: "architecture",
    status: "queued" as SubjobStatus,
    depends_on: def.dependsOn,
  }));

  const { data, error } = await client
    .from("pipeline_subjobs")
    .insert(rows)
    .select("*");

  if (error) throw new Error(`Failed to create subjobs: ${error.message}`);
  return data as SubjobRecord[];
}

export async function getSubjobs(
  client: SupabaseClient,
  jobId: string,
): Promise<SubjobRecord[]> {
  const { data, error } = await client
    .from("pipeline_subjobs")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch subjobs: ${error.message}`);
  return data as SubjobRecord[];
}

export async function markSubjobRunning(
  client: SupabaseClient,
  subjobId: string,
): Promise<void> {
  await client
    .from("pipeline_subjobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", subjobId);
}

export async function completeSubjob(
  client: SupabaseClient,
  subjobId: string,
  result: Record<string, unknown>,
  meta: { model?: string; tokens?: number; costUsd?: number; durationMs?: number } = {},
): Promise<void> {
  await client
    .from("pipeline_subjobs")
    .update({
      status: "completed",
      result,
      model_used: meta.model || null,
      tokens_used: meta.tokens || 0,
      cost_usd: meta.costUsd || 0,
      duration_ms: meta.durationMs || 0,
      completed_at: new Date().toISOString(),
    })
    .eq("id", subjobId);
}

export async function failSubjob(
  client: SupabaseClient,
  subjobId: string,
  error: string,
  isTimeout = false,
): Promise<void> {
  const status: SubjobStatus = isTimeout ? "failed_timeout" : "failed";
  await client
    .from("pipeline_subjobs")
    .update({
      status,
      error,
      completed_at: new Date().toISOString(),
    })
    .eq("id", subjobId);
}

export async function markRetryable(
  client: SupabaseClient,
  subjobId: string,
): Promise<void> {
  await client
    .from("pipeline_subjobs")
    .update({ status: "retryable" })
    .eq("id", subjobId);
}

export async function resetSubjobForRetry(
  client: SupabaseClient,
  subjobId: string,
): Promise<void> {
  // Increment attempt, reset status
  const { data } = await client
    .from("pipeline_subjobs")
    .select("attempt_number")
    .eq("id", subjobId)
    .single();

  await client
    .from("pipeline_subjobs")
    .update({
      status: "queued",
      error: null,
      result: null,
      started_at: null,
      completed_at: null,
      attempt_number: (data?.attempt_number || 1) + 1,
    })
    .eq("id", subjobId);
}

export async function blockDependents(
  client: SupabaseClient,
  jobId: string,
  failedKey: string,
): Promise<void> {
  // Find subjobs that depend on the failed one and are still queued
  const { data: allSubjobs } = await client
    .from("pipeline_subjobs")
    .select("id, depends_on, status")
    .eq("job_id", jobId);

  if (!allSubjobs) return;

  const toBlock = allSubjobs.filter(
    (s: any) =>
      s.status === "queued" &&
      (s.depends_on as string[]).includes(failedKey)
  );

  for (const s of toBlock) {
    await client
      .from("pipeline_subjobs")
      .update({ status: "blocked", error: `Blocked: dependency "${failedKey}" failed` })
      .eq("id", s.id);
  }
}

/** Timeout guard: mark any subjobs stuck in 'running' for more than maxMs as failed_timeout */
export async function cleanupStuckSubjobs(
  client: SupabaseClient,
  jobId: string,
  maxMs = 60_000,
): Promise<number> {
  const cutoff = new Date(Date.now() - maxMs).toISOString();
  const { data } = await client
    .from("pipeline_subjobs")
    .update({
      status: "failed_timeout" as SubjobStatus,
      error: `Timeout: exceeded ${maxMs}ms runtime limit`,
      completed_at: new Date().toISOString(),
    })
    .eq("job_id", jobId)
    .eq("status", "running")
    .lt("started_at", cutoff)
    .select("id");

  return data?.length || 0;
}
