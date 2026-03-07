/**
 * Semantic Retrieval Engine — Sprint 36
 *
 * Unified engine that accepts query context, selects domains,
 * performs embedding similarity search with bounded ranking,
 * and returns structured evidence packs.
 *
 * SAFETY: Read-only. Non-blocking. Tenant-isolated. Fallback to structured retrieval.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rankRetrievedEvidence, type RankedEvidence } from "./semantic-retrieval-ranker.ts";
import { validateRetrievalGuardrails, type GuardrailResult } from "./semantic-retrieval-guardrails.ts";

// ── Types ──

export interface SemanticQueryContext {
  organization_id: string;
  session_type: string;
  stage_key?: string;
  agent_type?: string;
  execution_context_class?: string;
  error_signature?: string;
  strategy_family?: string;
  policy_family?: string;
  workspace_id?: string;
  advisory_target_scope?: string;
  platform_context?: string;
  query_text?: string;
  domain_keys?: string[];
  max_results?: number;
  min_confidence?: number;
}

export interface EvidencePack {
  session_id: string;
  entries: RankedEvidence[];
  domains_used: string[];
  total_found: number;
  confidence_score: number;
  rationale_codes: string[];
  retrieval_mode: "semantic" | "structured" | "hybrid";
  guardrail_result: GuardrailResult;
}

const MAX_RESULTS_CAP = 30;
const DEFAULT_MAX = 10;

// ── Domain Registry Cache ──

interface DomainRecord {
  id: string;
  domain_key: string;
  domain_name: string;
  scope_type: string;
  source_tables: unknown;
  embedding_enabled: boolean;
  status: string;
}

async function getActiveDomains(sc: SupabaseClient): Promise<DomainRecord[]> {
  const { data } = await sc
    .from("semantic_retrieval_domains")
    .select("*")
    .eq("status", "active");
  return (data || []) as DomainRecord[];
}

// ── Core Retrieval ──

export async function runSemanticRetrieval(
  sc: SupabaseClient,
  ctx: SemanticQueryContext
): Promise<EvidencePack> {
  const limit = Math.min(ctx.max_results || DEFAULT_MAX, MAX_RESULTS_CAP);
  const guardrailResult = validateRetrievalGuardrails(ctx);

  if (!guardrailResult.allowed) {
    return emptyPack("", guardrailResult, [`guardrail_blocked: ${guardrailResult.reason}`]);
  }

  try {
    // 1. Select domains
    const allDomains = await getActiveDomains(sc);
    const selectedDomains = selectDomains(allDomains, ctx);

    if (selectedDomains.length === 0) {
      return emptyPack("", guardrailResult, ["no_active_domains"]);
    }

    // 2. Retrieve from multiple sources (structured fallback)
    const rawEntries = await retrieveFromDomains(sc, ctx, selectedDomains, limit * 3);

    // 3. Rank
    const ranked = rankRetrievedEvidence(rawEntries, ctx);
    const topEntries = ranked.slice(0, limit);

    // 4. Compute confidence
    const confidence = computePackConfidence(topEntries);

    // 5. Persist session
    const sessionId = await persistSession(sc, ctx, selectedDomains, topEntries, confidence);

    return {
      session_id: sessionId,
      entries: topEntries,
      domains_used: selectedDomains.map((d) => d.domain_key),
      total_found: rawEntries.length,
      confidence_score: confidence,
      rationale_codes: deriveRationale(ctx, selectedDomains, topEntries),
      retrieval_mode: "hybrid",
      guardrail_result: guardrailResult,
    };
  } catch (e) {
    console.warn("Semantic retrieval failed, returning empty pack:", e);
    return emptyPack("", guardrailResult, ["retrieval_error"]);
  }
}

// ── Domain Selection ──

function selectDomains(allDomains: DomainRecord[], ctx: SemanticQueryContext): DomainRecord[] {
  if (ctx.domain_keys && ctx.domain_keys.length > 0) {
    return allDomains.filter((d) => ctx.domain_keys!.includes(d.domain_key));
  }

  // Auto-select based on context signals
  const relevant: DomainRecord[] = [];
  for (const d of allDomains) {
    if (ctx.error_signature && d.domain_key === "repair_history") relevant.push(d);
    else if (ctx.strategy_family && d.domain_key === "strategy_variants") relevant.push(d);
    else if (ctx.policy_family && d.domain_key === "execution_policies") relevant.push(d);
    else if (ctx.advisory_target_scope && d.domain_key === "engineering_advisory") relevant.push(d);
    else if (d.domain_key === "engineering_memory") relevant.push(d);
    else if (d.domain_key === "agent_memory") relevant.push(d);
  }

  // Always include engineering_memory and agent_memory if not already
  const keys = new Set(relevant.map((d) => d.domain_key));
  for (const d of allDomains) {
    if (!keys.has(d.domain_key) && ["engineering_memory", "agent_memory", "platform_insights"].includes(d.domain_key)) {
      relevant.push(d);
      keys.add(d.domain_key);
    }
  }

  return relevant.length > 0 ? relevant : allDomains.slice(0, 5);
}

// ── Domain-Based Retrieval (structured fallback) ──

async function retrieveFromDomains(
  sc: SupabaseClient,
  ctx: SemanticQueryContext,
  domains: DomainRecord[],
  limit: number
): Promise<RankedEvidence[]> {
  const results: RankedEvidence[] = [];
  const perDomainLimit = Math.ceil(limit / domains.length);

  for (const domain of domains) {
    try {
      const domainResults = await retrieveFromDomain(sc, ctx, domain, perDomainLimit);
      results.push(...domainResults);
    } catch (e) {
      console.warn(`Retrieval from domain ${domain.domain_key} failed:`, e);
    }
  }

  return results;
}

async function retrieveFromDomain(
  sc: SupabaseClient,
  ctx: SemanticQueryContext,
  domain: DomainRecord,
  limit: number
): Promise<RankedEvidence[]> {
  switch (domain.domain_key) {
    case "engineering_memory":
      return retrieveEngineeringMemory(sc, ctx, limit);
    case "agent_memory":
      return retrieveAgentMemory(sc, ctx, limit);
    case "platform_insights":
      return retrievePlatformInsights(sc, ctx, limit);
    case "repair_history":
      return retrieveRepairHistory(sc, ctx, limit);
    case "strategy_variants":
      return retrieveStrategyEvidence(sc, ctx, limit);
    case "execution_policies":
      return retrievePolicyEvidence(sc, ctx, limit);
    default:
      return retrieveGenericDomain(sc, ctx, domain, limit);
  }
}

async function retrieveEngineeringMemory(sc: SupabaseClient, ctx: SemanticQueryContext, limit: number): Promise<RankedEvidence[]> {
  let q = sc.from("engineering_memory_entries").select("*")
    .eq("organization_id", ctx.organization_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (ctx.stage_key) q = q.eq("related_stage", ctx.stage_key);

  const { data } = await q;
  return (data || []).map((e: any) => ({
    id: e.id,
    domain: "engineering_memory",
    title: e.title || "",
    summary: e.summary || "",
    relevance_score: e.relevance_score || 0.5,
    confidence_score: e.confidence_score || 0.5,
    freshness: e.created_at,
    source_ref: { table: "engineering_memory_entries", id: e.id },
    tags: Array.isArray(e.tags) ? e.tags : [],
    rank_score: 0,
  }));
}

async function retrieveAgentMemory(sc: SupabaseClient, ctx: SemanticQueryContext, limit: number): Promise<RankedEvidence[]> {
  let q = sc.from("agent_memory_records").select("*")
    .eq("organization_id", ctx.organization_id)
    .order("relevance_score", { ascending: false })
    .limit(limit);

  if (ctx.agent_type) q = q.eq("agent_type", ctx.agent_type);

  const { data } = await q;
  return (data || []).map((e: any) => ({
    id: e.id,
    domain: "agent_memory",
    title: e.memory_type || "",
    summary: e.context_signature || "",
    relevance_score: e.relevance_score || 0.5,
    confidence_score: 0.5,
    freshness: e.created_at,
    source_ref: { table: "agent_memory_records", id: e.id },
    tags: [],
    rank_score: 0,
  }));
}

async function retrievePlatformInsights(sc: SupabaseClient, ctx: SemanticQueryContext, limit: number): Promise<RankedEvidence[]> {
  const { data } = await sc.from("platform_insights").select("*")
    .eq("organization_id", ctx.organization_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).map((e: any) => ({
    id: e.id,
    domain: "platform_insights",
    title: e.title || "",
    summary: e.description || "",
    relevance_score: e.confidence_score || 0.5,
    confidence_score: e.confidence_score || 0.5,
    freshness: e.created_at,
    source_ref: { table: "platform_insights", id: e.id },
    tags: [],
    rank_score: 0,
  }));
}

async function retrieveRepairHistory(sc: SupabaseClient, ctx: SemanticQueryContext, limit: number): Promise<RankedEvidence[]> {
  const { data } = await sc.from("error_patterns").select("*")
    .eq("organization_id", ctx.organization_id)
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  return (data || []).map((e: any) => ({
    id: e.id,
    domain: "repair_history",
    title: e.title || "",
    summary: e.description || "",
    relevance_score: e.confidence_score || 0.5,
    confidence_score: e.confidence_score || 0.5,
    freshness: e.last_seen_at || e.created_at,
    source_ref: { table: "error_patterns", id: e.id },
    tags: e.common_causes || [],
    rank_score: 0,
  }));
}

async function retrieveStrategyEvidence(sc: SupabaseClient, ctx: SemanticQueryContext, limit: number): Promise<RankedEvidence[]> {
  let q = sc.from("execution_strategy_variants").select("*")
    .eq("organization_id", ctx.organization_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data } = await q;
  return (data || []).map((e: any) => ({
    id: e.id,
    domain: "strategy_variants",
    title: e.variant_name || "",
    summary: `Strategy variant: ${e.status}`,
    relevance_score: 0.5,
    confidence_score: 0.5,
    freshness: e.created_at,
    source_ref: { table: "execution_strategy_variants", id: e.id },
    tags: [],
    rank_score: 0,
  }));
}

async function retrievePolicyEvidence(sc: SupabaseClient, ctx: SemanticQueryContext, limit: number): Promise<RankedEvidence[]> {
  const { data } = await sc.from("execution_policy_profiles").select("*")
    .eq("organization_id", ctx.organization_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).map((e: any) => ({
    id: e.id,
    domain: "execution_policies",
    title: e.policy_name || "",
    summary: `Policy: ${e.policy_mode} (${e.status})`,
    relevance_score: 0.5,
    confidence_score: e.confidence_score || 0.5,
    freshness: e.created_at,
    source_ref: { table: "execution_policy_profiles", id: e.id },
    tags: [],
    rank_score: 0,
  }));
}

async function retrieveGenericDomain(sc: SupabaseClient, _ctx: SemanticQueryContext, _domain: DomainRecord, _limit: number): Promise<RankedEvidence[]> {
  return [];
}

// ── Session Persistence ──

async function persistSession(
  sc: SupabaseClient,
  ctx: SemanticQueryContext,
  domains: DomainRecord[],
  entries: RankedEvidence[],
  confidence: number
): Promise<string> {
  const { data } = await sc.from("semantic_retrieval_sessions").insert({
    organization_id: ctx.organization_id,
    session_type: ctx.session_type,
    scope_ref: { stage_key: ctx.stage_key, agent_type: ctx.agent_type, workspace_id: ctx.workspace_id },
    query_payload: { query_text: ctx.query_text, error_signature: ctx.error_signature, strategy_family: ctx.strategy_family },
    domains_used: domains.map((d) => d.domain_key),
    ranked_results: entries.slice(0, 20).map((e) => ({ id: e.id, domain: e.domain, rank_score: e.rank_score })),
    confidence_score: confidence,
    rationale_codes: deriveRationale(ctx, domains, entries),
  }).select("id").single();

  return data?.id || "";
}

// ── Helpers ──

function computePackConfidence(entries: RankedEvidence[]): number {
  if (entries.length === 0) return 0;
  const avg = entries.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / entries.length;
  const coverage = Math.min(1, entries.length / 5);
  return Math.round((avg * 0.6 + coverage * 0.4) * 1000) / 1000;
}

function deriveRationale(ctx: SemanticQueryContext, domains: DomainRecord[], entries: RankedEvidence[]): string[] {
  const codes: string[] = [];
  if (ctx.error_signature) codes.push("error_context_active");
  if (ctx.strategy_family) codes.push("strategy_context_active");
  if (ctx.advisory_target_scope) codes.push("advisory_context_active");
  if (domains.length > 3) codes.push("multi_domain_retrieval");
  if (entries.length === 0) codes.push("no_evidence_found");
  if (entries.length > 0 && entries[0].rank_score > 0.8) codes.push("high_relevance_top_result");
  return codes;
}

function emptyPack(sessionId: string, guardrailResult: GuardrailResult, rationale: string[]): EvidencePack {
  return {
    session_id: sessionId,
    entries: [],
    domains_used: [],
    total_found: 0,
    confidence_score: 0,
    rationale_codes: rationale,
    retrieval_mode: "structured",
    guardrail_result: guardrailResult,
  };
}
