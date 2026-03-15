/**
 * useSystemIntelligenceData — Derives real insights from actual system data.
 * No mock data. Shows honest empty states when data is insufficient.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface SystemInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  confidence: number;
  iconKey: "knowledge" | "quality" | "learning" | "cost" | "delivery" | "coverage" | "health" | "pattern";
}

export interface SystemIntelligenceData {
  insights: SystemInsight[];
  summary: {
    totalInsights: number;
    patternsLearned: number;
    dataSourcesActive: number;
  };
  loading: boolean;
  error: string | null;
}

async function fetchIntelligenceData(orgId: string) {
  // Parallel queries for all data sources
  const [
    outputsRes,
    outputStatsRes,
    canonNodesRes,
    domainRes,
    learningRes,
    initiativesRes,
    storiesRes,
    canonCountRes,
  ] = await Promise.all([
    supabase
      .from("agent_outputs")
      .select("status")
      .eq("organization_id", orgId),
    supabase
      .from("agent_outputs")
      .select("cost_estimate, tokens_used")
      .eq("organization_id", orgId),
    supabase
      .from("canon_graph_nodes")
      .select("id")
      .eq("organization_id", orgId),
    supabase
      .from("canon_graph_nodes")
      .select("domain_scope")
      .eq("organization_id", orgId),
    supabase
      .from("operational_learning_signals")
      .select("signal_type")
      .eq("organization_id", orgId),
    supabase
      .from("initiatives")
      .select("id, stage_status")
      .eq("organization_id", orgId),
    supabase
      .from("stories")
      .select("status, initiative_id"),
    supabase
      .from("canon_entries")
      .select("id, lifecycle_status")
      .eq("organization_id", orgId),
  ]);

  const insights: SystemInsight[] = [];
  let dataSourcesActive = 0;

  // ── 1. Knowledge Base insight ──
  const canonCount = canonCountRes.data?.length ?? 0;
  const graphNodes = canonNodesRes.data?.length ?? 0;
  if (canonCount > 0) {
    dataSourcesActive++;
    const approvedCount = canonCountRes.data?.filter(e => e.lifecycle_status === "approved").length ?? 0;
    const approvalRate = canonCount > 0 ? Math.round((approvedCount / canonCount) * 100) : 0;
    insights.push({
      id: "knowledge-base",
      title: "sysIntel.insight.knowledgeTitle",
      description: `sysIntel.insight.knowledgeDesc|${canonCount}|${graphNodes}|${approvalRate}`,
      category: "sysIntel.catKnowledge",
      confidence: Math.min(95, Math.round(approvalRate * 0.95)),
      iconKey: "knowledge",
    });
  }

  // ── 2. Agent Output Quality ──
  const outputs = outputsRes.data ?? [];
  if (outputs.length > 0) {
    dataSourcesActive++;
    const approved = outputs.filter(o => o.status === "approved").length;
    const pending = outputs.filter(o => o.status === "pending_review").length;
    const approvalRate = Math.round((approved / outputs.length) * 100);
    insights.push({
      id: "output-quality",
      title: "sysIntel.insight.qualityTitle",
      description: `sysIntel.insight.qualityDesc|${approved}|${outputs.length}|${approvalRate}|${pending}`,
      category: "sysIntel.catPerformance",
      confidence: Math.min(98, approvalRate),
      iconKey: "quality",
    });
  }

  // ── 3. Learning Signals ──
  const signals = learningRes.data ?? [];
  if (signals.length > 0) {
    dataSourcesActive++;
    const signalTypes = new Map<string, number>();
    signals.forEach(s => signalTypes.set(s.signal_type, (signalTypes.get(s.signal_type) ?? 0) + 1));
    const topType = [...signalTypes.entries()].sort((a, b) => b[1] - a[1])[0];
    insights.push({
      id: "learning-signals",
      title: "sysIntel.insight.learningTitle",
      description: `sysIntel.insight.learningDesc|${signals.length}|${signalTypes.size}|${topType?.[0] ?? "unknown"}|${topType?.[1] ?? 0}`,
      category: "sysIntel.catLearning",
      confidence: Math.min(90, Math.round(60 + signals.length * 0.5)),
      iconKey: "learning",
    });
  }

  // ── 4. Cost Intelligence ──
  const outputStats = outputStatsRes.data ?? [];
  if (outputStats.length > 0) {
    dataSourcesActive++;
    const totalCost = outputStats.reduce((sum, o) => sum + (o.cost_estimate ?? 0), 0);
    const totalTokens = outputStats.reduce((sum, o) => sum + (o.tokens_used ?? 0), 0);
    const avgCostPerOutput = totalCost / outputStats.length;
    insights.push({
      id: "cost-tracking",
      title: "sysIntel.insight.costTitle",
      description: `sysIntel.insight.costDesc|${totalCost.toFixed(4)}|${outputStats.length}|${(totalTokens / 1000).toFixed(0)}K|${avgCostPerOutput.toFixed(4)}`,
      category: "sysIntel.catOptimization",
      confidence: 95,
      iconKey: "cost",
    });
  }

  // ── 5. Delivery Progress ──
  const initiatives = initiativesRes.data ?? [];
  const orgStoryIds = new Set(initiatives.map(i => i.id));
  const orgStories = (storiesRes.data ?? []).filter(s => orgStoryIds.has(s.initiative_id));
  if (initiatives.length > 0) {
    dataSourcesActive++;
    const completed = initiatives.filter(i => i.stage_status === "completed").length;
    const doneStories = orgStories.filter(s => s.status === "done").length;
    const totalStories = orgStories.length;
    insights.push({
      id: "delivery-progress",
      title: "sysIntel.insight.deliveryTitle",
      description: `sysIntel.insight.deliveryDesc|${initiatives.length}|${completed}|${doneStories}|${totalStories}`,
      category: "sysIntel.catHealth",
      confidence: Math.min(95, Math.round((completed / initiatives.length) * 100)),
      iconKey: "delivery",
    });
  }

  // ── 6. Domain Coverage ──
  const domainData = domainRes.data ?? [];
  if (domainData.length > 0) {
    dataSourcesActive++;
    const domains = new Set(domainData.map(d => d.domain_scope));
    const domainCounts = new Map<string, number>();
    domainData.forEach(d => domainCounts.set(d.domain_scope, (domainCounts.get(d.domain_scope) ?? 0) + 1));
    const topDomain = [...domainCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    insights.push({
      id: "domain-coverage",
      title: "sysIntel.insight.coverageTitle",
      description: `sysIntel.insight.coverageDesc|${domains.size}|${domainData.length}|${topDomain?.[0] ?? ""}|${topDomain?.[1] ?? 0}`,
      category: "sysIntel.catArchitecture",
      confidence: Math.min(92, Math.round(50 + domains.size * 5)),
      iconKey: "coverage",
    });
  }

  return {
    insights,
    summary: {
      totalInsights: insights.length,
      patternsLearned: graphNodes,
      dataSourcesActive,
    },
  };
}

export function useSystemIntelligenceData(): SystemIntelligenceData {
  const { organizationId } = useOrganization();

  const { data, isLoading, error } = useQuery({
    queryKey: ["system-intelligence", organizationId],
    queryFn: () => fetchIntelligenceData(organizationId!),
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  return {
    insights: data?.insights ?? [],
    summary: data?.summary ?? { totalInsights: 0, patternsLearned: 0, dataSourcesActive: 0 },
    loading: isLoading,
    error: error?.message ?? null,
  };
}
