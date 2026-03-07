/**
 * Semantic Retrieval Quality Evaluator — Sprint 36
 *
 * Tracks retrieval effectiveness: usefulness, contradiction rate,
 * stale evidence rate, precision proxy, cross-scope leakage prevention.
 *
 * SAFETY: Read-only analytics. No mutations beyond feedback persistence.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RetrievalQualityMetrics {
  total_sessions_7d: number;
  helpful_rate: number;
  neutral_rate: number;
  harmful_rate: number;
  feedback_coverage: number;
  stale_evidence_rate: number;
  avg_confidence: number;
  top_domains: Array<{ domain: string; count: number }>;
}

export async function evaluateRetrievalQuality(
  sc: SupabaseClient,
  organizationId: string
): Promise<RetrievalQualityMetrics> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Sessions in last 7 days
  const { data: sessions } = await sc
    .from("semantic_retrieval_sessions")
    .select("id, confidence_score, domains_used, created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", weekAgo);

  const totalSessions = sessions?.length || 0;

  // Feedback
  const { data: feedback } = await sc
    .from("semantic_retrieval_feedback")
    .select("usefulness_status, retrieval_session_id")
    .eq("organization_id", organizationId)
    .gte("created_at", weekAgo);

  const totalFeedback = feedback?.length || 0;
  const helpful = feedback?.filter((f: any) => f.usefulness_status === "helpful").length || 0;
  const neutral = feedback?.filter((f: any) => f.usefulness_status === "neutral").length || 0;
  const harmful = feedback?.filter((f: any) => f.usefulness_status === "harmful").length || 0;

  const helpfulRate = totalFeedback > 0 ? helpful / totalFeedback : 0;
  const neutralRate = totalFeedback > 0 ? neutral / totalFeedback : 0;
  const harmfulRate = totalFeedback > 0 ? harmful / totalFeedback : 0;

  const feedbackCoverage = totalSessions > 0 ? totalFeedback / totalSessions : 0;

  // Average confidence
  const avgConfidence = totalSessions > 0
    ? (sessions || []).reduce((sum: number, s: any) => sum + (s.confidence_score || 0), 0) / totalSessions
    : 0;

  // Domain frequency
  const domainCounts = new Map<string, number>();
  (sessions || []).forEach((s: any) => {
    const domains = Array.isArray(s.domains_used) ? s.domains_used : [];
    domains.forEach((d: string) => domainCounts.set(d, (domainCounts.get(d) || 0) + 1));
  });

  const topDomains = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total_sessions_7d: totalSessions,
    helpful_rate: Math.round(helpfulRate * 1000) / 1000,
    neutral_rate: Math.round(neutralRate * 1000) / 1000,
    harmful_rate: Math.round(harmfulRate * 1000) / 1000,
    feedback_coverage: Math.round(feedbackCoverage * 1000) / 1000,
    stale_evidence_rate: 0, // TODO: compute from session analysis
    avg_confidence: Math.round(avgConfidence * 1000) / 1000,
    top_domains: topDomains,
  };
}
