import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export interface GovernanceInsightSummary {
  canonEvolution: ProposalCounts;
  policyTuning: ProposalCounts;
  agentSelectionTuning: ProposalCounts;
  readinessTuning: ProposalCounts;
  learningSignals: { total: number; highSeverity: number; bySeverity: Record<string, number> };
  approvalBurden: { pending: number; rejected: number; expired: number; total: number };
  blockedActions: { total: number; highRisk: number };
  frictionPatterns: FrictionPattern[];
}

export interface ProposalCounts {
  total: number;
  proposed: number;
  under_review: number;
  accepted: number;
  rejected: number;
  highConfidence: number;
  highSeverity: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recent: any[];
}

export interface FrictionPattern {
  id: string;
  type: string;
  stage: string;
  severity: string;
  count: number;
  summary: string;
  linkedProposalIds: string[];
  linkedActionIds: string[];
}

function emptyProposalCounts(): ProposalCounts {
  return { total: 0, proposed: 0, under_review: 0, accepted: 0, rejected: 0, highConfidence: 0, highSeverity: 0, byType: {}, bySeverity: {}, recent: [] };
}

function mapProposals(proposals: any[]): ProposalCounts {
  const counts = emptyProposalCounts();
  counts.total = proposals.length;
  counts.recent = proposals.slice(0, 5);
  for (const p of proposals) {
    const status = p.review_status || "proposed";
    if (status === "proposed") counts.proposed++;
    if (status === "under_review") counts.under_review++;
    if (status === "accepted") counts.accepted++;
    if (status === "rejected") counts.rejected++;
    if ((p.confidence ?? 0) >= 0.7) counts.highConfidence++;
    const sev = p.severity || "medium";
    if (sev === "critical" || sev === "high") counts.highSeverity++;
    counts.byType[p.proposal_type || "unknown"] = (counts.byType[p.proposal_type || "unknown"] || 0) + 1;
    counts.bySeverity[sev] = (counts.bySeverity[sev] || 0) + 1;
  }
  return counts;
}

export function useGovernanceInsights(filters?: { stage?: string; severity?: string; insightType?: string }) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery<GovernanceInsightSummary>({
    queryKey: ["governance-insights", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      // Fetch all data sources in parallel
      const [
        canonRes,
        policyRes,
        agentSelRes,
        readinessRes,
        signalsRes,
        approvalsRes,
        actionsRes,
      ] = await Promise.all([
        supabase.from("canon_evolution_proposals" as any).select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(100),
        supabase.from("policy_tuning_proposals" as any).select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(100),
        supabase.from("agent_selection_tuning_proposals").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(100),
        supabase.from("readiness_tuning_proposals" as any).select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(100),
        supabase.from("learning_signals" as any).select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(200),
        supabase.from("action_approval_requests").select("*").eq("organization_id", orgId!).limit(200),
        supabase.from("action_registry_entries").select("*").eq("organization_id", orgId!).eq("status", "blocked").limit(100),
      ]);

      const canonProposals = (canonRes.data as any[]) || [];
      const policyProposals = (policyRes.data as any[]) || [];
      const agentSelProposals = (agentSelRes.data as any[]) || [];
      const readinessProposals = (readinessRes.data as any[]) || [];
      const signals = (signalsRes.data as any[]) || [];
      const approvals = (approvalsRes.data as any[]) || [];
      const blockedActions = (actionsRes.data as any[]) || [];

      // Learning signals
      const highSevSignals = signals.filter((s: any) => s.severity === "critical" || s.severity === "high");
      const bySeverity: Record<string, number> = {};
      for (const s of signals) {
        const sv = s.severity || "info";
        bySeverity[sv] = (bySeverity[sv] || 0) + 1;
      }

      // Approval burden
      const pending = approvals.filter((a: any) => a.status === "pending" || a.status === "waiting_approval").length;
      const rejected = approvals.filter((a: any) => a.status === "rejected").length;
      const expired = approvals.filter((a: any) => a.status === "expired").length;

      // Friction patterns from repeated blocked/rejected actions
      const frictionMap = new Map<string, FrictionPattern>();
      for (const a of blockedActions) {
        const key = `blocked-${a.stage || "unknown"}-${a.trigger_type || "unknown"}`;
        const existing = frictionMap.get(key);
        if (existing) {
          existing.count++;
          existing.linkedActionIds.push(a.id);
        } else {
          frictionMap.set(key, {
            id: key,
            type: "repeated_blocked_pattern",
            stage: a.stage || "unknown",
            severity: a.risk_level || "medium",
            count: 1,
            summary: `Repeated blocked ${a.trigger_type || "action"} in ${a.stage || "unknown"} stage`,
            linkedProposalIds: [],
            linkedActionIds: [a.id],
          });
        }
      }

      // Apply filters
      let patterns = Array.from(frictionMap.values());
      if (filters?.stage) patterns = patterns.filter(p => p.stage === filters.stage);
      if (filters?.severity) patterns = patterns.filter(p => p.severity === filters.severity);

      return {
        canonEvolution: mapProposals(canonProposals),
        policyTuning: mapProposals(policyProposals),
        agentSelectionTuning: mapProposals(agentSelProposals),
        readinessTuning: mapProposals(readinessProposals),
        learningSignals: { total: signals.length, highSeverity: highSevSignals.length, bySeverity },
        approvalBurden: { pending, rejected, expired, total: approvals.length },
        blockedActions: {
          total: blockedActions.length,
          highRisk: blockedActions.filter((a: any) => a.risk_level === "critical" || a.risk_level === "high").length,
        },
        frictionPatterns: patterns.sort((a, b) => b.count - a.count).slice(0, 20),
      };
    },
    staleTime: 1000 * 60 * 2,
  });
}
