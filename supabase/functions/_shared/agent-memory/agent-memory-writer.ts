/**
 * Agent Memory Writer — Sprint 24
 * Writes useful new memory signals after agent execution.
 * SAFETY: Evaluates signal quality before writing. Avoids noisy writes.
 * All writes are auditable and preserve lineage.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface MemoryWriteInput {
  organization_id: string;
  agent_type: string;
  stage_key?: string;
  memory_type: "execution_pattern" | "repair_pattern" | "validation_pattern" | "review_pattern" | "failure_pattern" | "success_pattern";
  context_signature: string;
  memory_payload: Record<string, unknown>;
  relevance_score?: number;
  source_refs?: Record<string, unknown>[];
  event_id?: string;
}

export interface MemoryWriteResult {
  written: boolean;
  record_id: string | null;
  reason: string;
}

const MIN_PAYLOAD_FIELDS = 1;
const MAX_CONTEXT_SIG_LEN = 500;

export function shouldWriteMemory(input: MemoryWriteInput): { eligible: boolean; reason: string } {
  if (!input.organization_id) return { eligible: false, reason: "missing_organization_id" };
  if (!input.agent_type) return { eligible: false, reason: "missing_agent_type" };
  if (!input.context_signature || input.context_signature.length === 0) return { eligible: false, reason: "empty_context_signature" };
  if (input.context_signature.length > MAX_CONTEXT_SIG_LEN) return { eligible: false, reason: "context_signature_too_long" };
  
  const payloadKeys = Object.keys(input.memory_payload || {});
  if (payloadKeys.length < MIN_PAYLOAD_FIELDS) return { eligible: false, reason: "payload_too_sparse" };

  if (input.relevance_score !== undefined && input.relevance_score < 0.1) {
    return { eligible: false, reason: "relevance_too_low" };
  }

  return { eligible: true, reason: "eligible" };
}

export async function writeAgentMemory(
  sc: SupabaseClient,
  input: MemoryWriteInput,
): Promise<MemoryWriteResult> {
  const check = shouldWriteMemory(input);
  if (!check.eligible) {
    return { written: false, record_id: null, reason: check.reason };
  }

  try {
    const { data, error } = await sc.from("agent_memory_records").insert({
      organization_id: input.organization_id,
      agent_type: input.agent_type,
      stage_key: input.stage_key || null,
      memory_type: input.memory_type,
      context_signature: input.context_signature,
      memory_payload: input.memory_payload,
      relevance_score: input.relevance_score ?? 0.5,
      source_refs: input.source_refs || null,
      created_from_event_id: input.event_id || null,
    }).select("id").single();

    if (error) throw error;

    return { written: true, record_id: data?.id || null, reason: "written" };
  } catch (e) {
    console.warn("Agent memory write failed (non-blocking):", e);
    return { written: false, record_id: null, reason: `write_error: ${(e as Error).message}` };
  }
}

export interface ProfileUpdateInput {
  organization_id: string;
  agent_type: string;
  stage_key?: string;
  memory_scope: string;
  memory_summary: string;
  confidence_delta?: number;
  support_increment?: number;
}

export async function updateAgentMemoryProfile(
  sc: SupabaseClient,
  input: ProfileUpdateInput,
): Promise<{ updated: boolean; reason: string }> {
  try {
    // Check for existing profile
    const { data: existing } = await sc.from("agent_memory_profiles")
      .select("id, confidence, support_count")
      .eq("organization_id", input.organization_id)
      .eq("agent_type", input.agent_type)
      .eq("memory_scope", input.memory_scope)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      const newConf = Math.min(0.95, Math.max(0.05, (existing.confidence ?? 0.5) + (input.confidence_delta ?? 0)));
      const newSupport = (existing.support_count ?? 0) + (input.support_increment ?? 1);
      await sc.from("agent_memory_profiles").update({
        memory_summary: input.memory_summary,
        confidence: newConf,
        support_count: newSupport,
      }).eq("id", existing.id);
      return { updated: true, reason: "profile_updated" };
    } else {
      await sc.from("agent_memory_profiles").insert({
        organization_id: input.organization_id,
        agent_type: input.agent_type,
        stage_key: input.stage_key || null,
        memory_scope: input.memory_scope,
        memory_summary: input.memory_summary,
        confidence: 0.5,
        support_count: 1,
        status: "active",
      });
      return { updated: true, reason: "profile_created" };
    }
  } catch (e) {
    console.warn("Agent memory profile update failed (non-blocking):", e);
    return { updated: false, reason: `update_error: ${(e as Error).message}` };
  }
}
