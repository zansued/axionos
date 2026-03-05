// Shared pipeline helper functions (log, job management, initiative updates)

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PipelineContext {
  serviceClient: SupabaseClient;
  userId: string;
  initiativeId: string;
  organizationId: string;
}

/** Log an audit event for a pipeline action */
export async function pipelineLog(
  ctx: PipelineContext,
  action: string,
  message: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  await ctx.serviceClient.from("audit_logs").insert({
    user_id: ctx.userId,
    action,
    category: "pipeline",
    entity_type: "initiatives",
    entity_id: ctx.initiativeId,
    message,
    severity: "info",
    organization_id: ctx.organizationId,
    metadata: meta,
  });
}

/** Update initiative fields */
export async function updateInitiative(
  ctx: PipelineContext,
  fields: Record<string, unknown>
): Promise<void> {
  await ctx.serviceClient
    .from("initiatives")
    .update(fields)
    .eq("id", ctx.initiativeId);
}

/** Create a pipeline job record and return its ID */
export async function createJob(
  ctx: PipelineContext,
  stage: string,
  inputs: Record<string, unknown>
): Promise<string | null> {
  const { data } = await ctx.serviceClient
    .from("initiative_jobs")
    .insert({
      initiative_id: ctx.initiativeId,
      stage,
      status: "running",
      inputs,
      user_id: ctx.userId,
    })
    .select("id")
    .single();
  return data?.id || null;
}

/** Mark a job as successfully completed */
export async function completeJob(
  ctx: PipelineContext,
  jobId: string,
  outputs: Record<string, unknown>,
  result: { model?: string; costUsd?: number; durationMs?: number }
): Promise<void> {
  await ctx.serviceClient
    .from("initiative_jobs")
    .update({
      status: "success",
      outputs,
      model: result.model,
      cost_usd: result.costUsd,
      duration_ms: result.durationMs,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

/** Mark a job as failed */
export async function failJob(
  ctx: PipelineContext,
  jobId: string,
  error: string
): Promise<void> {
  await ctx.serviceClient
    .from("initiative_jobs")
    .update({
      status: "failed",
      error,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

/** Record an agent message for traceability */
export async function recordAgentMessage(
  ctx: PipelineContext,
  params: {
    storyId: string | null;
    subtaskId: string | null;
    fromAgent: { id?: string; role?: string } | null;
    toAgent: { id?: string; role?: string } | null;
    content: string;
    messageType: string;
    iteration: number;
    tokens?: number;
    model?: string;
    stage?: string;
  }
): Promise<void> {
  await ctx.serviceClient.from("agent_messages").insert({
    initiative_id: ctx.initiativeId,
    story_id: params.storyId,
    subtask_id: params.subtaskId,
    from_agent_id: params.fromAgent?.id || null,
    to_agent_id: params.toAgent?.id || null,
    role_from: params.fromAgent?.role || "system",
    role_to: params.toAgent?.role || "system",
    content: params.content,
    message_type: params.messageType,
    iteration: params.iteration,
    tokens_used: params.tokens || 0,
    model_used: params.model || "",
    stage: params.stage || "execution",
  });
}

/** Pick the best agent for a task description based on keyword matching */
export function pickAgentByDescription(
  description: string,
  agentsByRole: Record<string, unknown>,
  fallback: unknown
): unknown {
  const lower = description.toLowerCase();
  const rules: [RegExp, string][] = [
    [/arquitetura|design|padr[ãa]o|diagrama|componente/i, "architect"],
    [/teste|qa|qualidade|validar|cenário/i, "qa"],
    [/deploy|ci\/cd|infra|docker|pipeline/i, "devops"],
    [/ux|interface|usabilidade|layout|wireframe/i, "ux_expert"],
    [/requisito|análise|negócio|stakeholder/i, "analyst"],
    [/história|prioridade|backlog|aceite/i, "po"],
    [/sprint|cerimônia|impedimento|equipe/i, "sm"],
    [/código|implementar|api|endpoint|função|banco/i, "dev"],
  ];

  for (const [pattern, role] of rules) {
    if (pattern.test(lower) && agentsByRole[role]) {
      return agentsByRole[role];
    }
  }
  return fallback;
}
