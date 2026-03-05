// Project Brain shared helpers for pipeline stages
// Provides functions to read/write nodes, edges, decisions, and errors

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PipelineContext } from "./pipeline-helpers.ts";

export type NodeType = "file" | "component" | "hook" | "service" | "api" | "table" | "type" | "schema" | "edge_function" | "page" | "context" | "util";
export type RelationType = "imports" | "depends_on" | "calls_api" | "stores_in_table" | "uses_component" | "implements_interface" | "exports" | "renders";
export type NodeStatus = "planned" | "generated" | "validated" | "published";

export interface BrainNode {
  id?: string;
  node_type: NodeType;
  name: string;
  file_path?: string;
  metadata?: Record<string, unknown>;
  content_hash?: string;
  status?: NodeStatus;
}

export interface BrainEdge {
  source_node_id: string;
  target_node_id: string;
  relation_type: RelationType;
  metadata?: Record<string, unknown>;
}

// ── READ OPERATIONS ──

/** Get all brain nodes for an initiative, optionally filtered by type */
export async function getBrainNodes(
  ctx: PipelineContext,
  nodeType?: NodeType
): Promise<any[]> {
  let query = ctx.serviceClient
    .from("project_brain_nodes")
    .select("*")
    .eq("initiative_id", ctx.initiativeId)
    .order("created_at", { ascending: true });

  if (nodeType) query = query.eq("node_type", nodeType);

  const { data } = await query;
  return data || [];
}

/** Get all edges for an initiative */
export async function getBrainEdges(ctx: PipelineContext): Promise<any[]> {
  const { data } = await ctx.serviceClient
    .from("project_brain_edges")
    .select("*")
    .eq("initiative_id", ctx.initiativeId);
  return data || [];
}

/** Get node by file_path */
export async function getNodeByPath(ctx: PipelineContext, filePath: string): Promise<any | null> {
  const { data } = await ctx.serviceClient
    .from("project_brain_nodes")
    .select("*")
    .eq("initiative_id", ctx.initiativeId)
    .eq("file_path", filePath)
    .maybeSingle();
  return data;
}

/** Get all decisions for an initiative */
export async function getDecisions(ctx: PipelineContext, category?: string): Promise<any[]> {
  let query = ctx.serviceClient
    .from("project_decisions")
    .select("*")
    .eq("initiative_id", ctx.initiativeId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  const { data } = await query;
  return data || [];
}

/** Get recent errors for an initiative */
export async function getRecentErrors(ctx: PipelineContext, limit = 20): Promise<any[]> {
  const { data } = await ctx.serviceClient
    .from("project_errors")
    .select("*")
    .eq("initiative_id", ctx.initiativeId)
    .order("detected_at", { ascending: false })
    .limit(limit);
  return data || [];
}

/** Get unfixed errors to inject as prevention context */
export async function getPreventionRules(ctx: PipelineContext): Promise<string[]> {
  const { data } = await ctx.serviceClient
    .from("project_errors")
    .select("prevention_rule")
    .eq("initiative_id", ctx.initiativeId)
    .not("prevention_rule", "is", null)
    .order("detected_at", { ascending: false })
    .limit(30);
  return (data || []).map((e: any) => e.prevention_rule).filter(Boolean);
}

/** Search nodes by text (full-text search) */
export async function searchNodes(ctx: PipelineContext, query: string): Promise<any[]> {
  const { data } = await ctx.serviceClient
    .from("project_brain_nodes")
    .select("*")
    .eq("initiative_id", ctx.initiativeId)
    .textSearch("search_vector", query, { type: "websearch" })
    .limit(20);
  return data || [];
}

/** Get direct dependencies of a node (outgoing edges) */
export async function getNodeDependencies(ctx: PipelineContext, nodeId: string): Promise<any[]> {
  const { data } = await ctx.serviceClient
    .from("project_brain_edges")
    .select("*, target:project_brain_nodes!project_brain_edges_target_node_id_fkey(*)")
    .eq("source_node_id", nodeId);
  return data || [];
}

/** Get dependents of a node (incoming edges) */
export async function getNodeDependents(ctx: PipelineContext, nodeId: string): Promise<any[]> {
  const { data } = await ctx.serviceClient
    .from("project_brain_edges")
    .select("*, source:project_brain_nodes!project_brain_edges_source_node_id_fkey(*)")
    .eq("target_node_id", nodeId);
  return data || [];
}

// ── WRITE OPERATIONS ──

/** Upsert a brain node (by file_path if provided, otherwise insert) */
export async function upsertNode(ctx: PipelineContext, node: BrainNode): Promise<string> {
  if (node.file_path) {
    const existing = await getNodeByPath(ctx, node.file_path);
    if (existing) {
      await ctx.serviceClient
        .from("project_brain_nodes")
        .update({
          name: node.name,
          node_type: node.node_type,
          metadata: node.metadata || {},
          content_hash: node.content_hash,
          status: node.status || existing.status,
        })
        .eq("id", existing.id);
      return existing.id;
    }
  }

  const { data } = await ctx.serviceClient
    .from("project_brain_nodes")
    .insert({
      initiative_id: ctx.initiativeId,
      organization_id: ctx.organizationId,
      node_type: node.node_type,
      name: node.name,
      file_path: node.file_path,
      metadata: node.metadata || {},
      content_hash: node.content_hash,
      status: node.status || "planned",
    })
    .select("id")
    .single();

  return data?.id || "";
}

/** Batch upsert multiple nodes */
export async function upsertNodes(ctx: PipelineContext, nodes: BrainNode[]): Promise<string[]> {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(await upsertNode(ctx, node));
  }
  return ids;
}

/** Add an edge between two nodes (idempotent) */
export async function addEdge(ctx: PipelineContext, edge: BrainEdge): Promise<void> {
  // Check if edge already exists
  const { data: existing } = await ctx.serviceClient
    .from("project_brain_edges")
    .select("id")
    .eq("source_node_id", edge.source_node_id)
    .eq("target_node_id", edge.target_node_id)
    .eq("relation_type", edge.relation_type)
    .maybeSingle();

  if (existing) return;

  await ctx.serviceClient.from("project_brain_edges").insert({
    initiative_id: ctx.initiativeId,
    organization_id: ctx.organizationId,
    ...edge,
  });
}

/** Record a project decision */
export async function recordDecision(
  ctx: PipelineContext,
  decision: string,
  reason: string,
  impact?: string,
  category = "architecture",
  agentId?: string
): Promise<string> {
  const { data } = await ctx.serviceClient
    .from("project_decisions")
    .insert({
      initiative_id: ctx.initiativeId,
      organization_id: ctx.organizationId,
      decision,
      reason,
      impact,
      category,
      decided_by_agent_id: agentId || null,
    })
    .select("id")
    .single();
  return data?.id || "";
}

/** Record a project error */
export async function recordError(
  ctx: PipelineContext,
  errorMessage: string,
  errorType = "typescript",
  filePath?: string,
  rootCause?: string,
  preventionRule?: string
): Promise<string> {
  const { data } = await ctx.serviceClient
    .from("project_errors")
    .insert({
      initiative_id: ctx.initiativeId,
      organization_id: ctx.organizationId,
      file_path: filePath,
      error_type: errorType,
      error_message: errorMessage,
      root_cause: rootCause,
      prevention_rule: preventionRule,
    })
    .select("id")
    .single();
  return data?.id || "";
}

/** Mark an error as fixed */
export async function markErrorFixed(
  client: SupabaseClient,
  errorId: string,
  agentId?: string
): Promise<void> {
  await client
    .from("project_errors")
    .update({
      fixed: true,
      fixed_at: new Date().toISOString(),
      fixed_by_agent_id: agentId || null,
    })
    .eq("id", errorId);
}

/** Update node status (e.g. planned → generated → validated → published) */
export async function updateNodeStatus(ctx: PipelineContext, nodeId: string, status: NodeStatus): Promise<void> {
  await ctx.serviceClient
    .from("project_brain_nodes")
    .update({ status })
    .eq("id", nodeId);
}

// ── PREVENTION RULES (Self-Healing) ──

/** Get high-confidence prevention rules from the dedicated table */
export async function getPreventionRulesV2(ctx: PipelineContext, scope?: string): Promise<any[]> {
  let query = ctx.serviceClient
    .from("project_prevention_rules")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .gte("confidence_score", 0.3)
    .order("confidence_score", { ascending: false })
    .limit(30);

  // Include both initiative-specific and org-wide rules
  if (scope === "initiative") {
    query = query.eq("initiative_id", ctx.initiativeId);
  }

  const { data } = await query;
  return data || [];
}

/** Upsert a prevention rule — bumps confidence if pattern already exists */
export async function upsertPreventionRule(
  ctx: PipelineContext,
  errorPattern: string,
  preventionRule: string,
  scope = "initiative",
  sourceErrorId?: string
): Promise<string> {
  // Check for existing similar pattern
  const { data: existing } = await ctx.serviceClient
    .from("project_prevention_rules")
    .select("id, confidence_score, times_triggered")
    .eq("organization_id", ctx.organizationId)
    .eq("error_pattern", errorPattern)
    .maybeSingle();

  if (existing) {
    // Bump confidence (max 1.0) and increment trigger count
    const newConfidence = Math.min((existing.confidence_score || 0.5) + 0.1, 1.0);
    await ctx.serviceClient
      .from("project_prevention_rules")
      .update({
        confidence_score: newConfidence,
        times_triggered: (existing.times_triggered || 1) + 1,
        last_triggered_at: new Date().toISOString(),
        prevention_rule: preventionRule, // Update with latest fix knowledge
      })
      .eq("id", existing.id);
    return existing.id;
  }

  // Insert new rule
  const { data } = await ctx.serviceClient
    .from("project_prevention_rules")
    .insert({
      initiative_id: ctx.initiativeId,
      organization_id: ctx.organizationId,
      error_pattern: errorPattern,
      prevention_rule: preventionRule,
      scope,
      confidence_score: 0.5,
      source_error_id: sourceErrorId || null,
    })
    .select("id")
    .single();

  return data?.id || "";
}

// ── CONTEXT GENERATION ──

/** Generate a compact project context string for AI prompts */
export async function generateBrainContext(ctx: PipelineContext): Promise<string> {
  const [nodes, decisions, legacyRules, preventionRules] = await Promise.all([
    getBrainNodes(ctx),
    getDecisions(ctx),
    getPreventionRules(ctx),
    getPreventionRulesV2(ctx),
  ]);

  if (nodes.length === 0 && decisions.length === 0 && preventionRules.length === 0) return "";

  const sections: string[] = ["=== PROJECT BRAIN CONTEXT ==="];

  // Project map
  if (nodes.length > 0) {
    const byType: Record<string, any[]> = {};
    for (const n of nodes) {
      (byType[n.node_type] ||= []).push(n);
    }
    sections.push("\n## Project Structure");
    for (const [type, items] of Object.entries(byType)) {
      sections.push(`### ${type}s (${items.length})`);
      for (const item of items.slice(0, 30)) {
        const path = item.file_path ? ` → ${item.file_path}` : "";
        sections.push(`- ${item.name}${path} [${item.status}]`);
      }
    }
  }

  // Decisions
  if (decisions.length > 0) {
    sections.push("\n## Architectural Decisions");
    for (const d of decisions.slice(0, 15)) {
      sections.push(`- [${d.category}] ${d.decision} — Reason: ${d.reason}`);
    }
  }

  // Prevention rules (combined: legacy + v2, deduplicated, sorted by confidence)
  const allRules: Array<{ rule: string; confidence: number }> = [];
  for (const rule of legacyRules) {
    allRules.push({ rule, confidence: 0.4 });
  }
  for (const r of preventionRules) {
    allRules.push({ rule: `[${r.error_pattern}] → ${r.prevention_rule}`, confidence: r.confidence_score });
  }
  // Deduplicate and sort
  const uniqueRules = [...new Map(allRules.map(r => [r.rule, r])).values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20);

  if (uniqueRules.length > 0) {
    sections.push("\n## ⚠️ KNOWN ERRORS TO AVOID (Self-Healing Rules)");
    sections.push("These rules were learned from previous CI failures. MUST follow them:");
    for (const r of uniqueRules) {
      const stars = r.confidence >= 0.8 ? "🔴" : r.confidence >= 0.6 ? "🟡" : "⚪";
      sections.push(`- ${stars} ${r.rule} (confidence: ${(r.confidence * 100).toFixed(0)}%)`);
    }
  }

  return sections.join("\n");
}
