import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

// ── Types ────────────────────────────────────────────────────────────────────

export interface GovernanceData {
  systemHealth: SystemHealthData;
  actionExecution: ActionExecutionData;
  agentPerformance: AgentPerformanceData;
  canonUsage: CanonUsageData;
  policyImpact: PolicyImpactData;
  readiness: ReadinessData;
  recovery: RecoveryData;
  learningSignals: LearningSignalsData;
  proposals: ProposalsData;
  frictionPatterns: FrictionPattern[];
}

export interface SystemHealthData {
  totalActions: number;
  completedActions: number;
  failedActions: number;
  blockedActions: number;
  recoveryActivations: number;
  humanApprovalRate: number;
  successRate: number;
  failureRate: number;
  recoveryRate: number;
}

export interface ActionExecutionData {
  byTriggerType: Record<string, ActionTypeStats>;
  byStage: Record<string, ActionTypeStats>;
  topFailures: ActionTypeStats[];
  topRecoveryTriggers: ActionTypeStats[];
  requiresApproval: number;
  recentActions: any[];
}

export interface ActionTypeStats {
  name: string;
  total: number;
  completed: number;
  failed: number;
  blocked: number;
  recoveryCount: number;
  successRate: number;
}

export interface AgentPerformanceData {
  decisions: AgentDecisionStats[];
  totalDecisions: number;
  avgConfidence: number;
  topPerforming: AgentDecisionStats[];
  needsAttention: AgentDecisionStats[];
}

export interface AgentDecisionStats {
  agentId: string;
  capability: string;
  totalDecisions: number;
  successCount: number;
  failureCount: number;
  avgConfidence: number;
  successRate: number;
}

export interface CanonUsageData {
  totalEntries: number;
  activeEntries: number;
  deprecatedEntries: number;
  topUsedPatterns: CanonPatternStats[];
  underusedPatterns: CanonPatternStats[];
  failureLinkedPatterns: CanonPatternStats[];
}

export interface CanonPatternStats {
  id: string;
  title: string;
  type: string;
  status: string;
  usageCount: number;
  successCorrelation: number;
}

export interface PolicyImpactData {
  totalEnforcements: number;
  blockedByPolicy: number;
  approvalRequired: number;
  overrideCount: number;
  byRiskLevel: Record<string, number>;
  byStage: Record<string, number>;
}

export interface ReadinessData {
  totalChecks: number;
  passed: number;
  blocked: number;
  topBlockers: ReadinessBlocker[];
  byStage: Record<string, { passed: number; blocked: number }>;
}

export interface ReadinessBlocker {
  stage: string;
  reason: string;
  count: number;
}

export interface RecoveryData {
  totalActivations: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  successRate: number;
  byType: Record<string, number>;
  topPatterns: RecoveryPattern[];
}

export interface RecoveryPattern {
  type: string;
  stage: string;
  count: number;
  successRate: number;
}

export interface LearningSignalsData {
  total: number;
  highSeverity: number;
  bySeverity: Record<string, number>;
  bySignalType: Record<string, number>;
  byRoutingTarget: Record<string, number>;
  recentSignals: any[];
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

export interface ProposalsData {
  canonEvolution: ProposalCounts;
  policyTuning: ProposalCounts;
  agentSelectionTuning: ProposalCounts;
  readinessTuning: ProposalCounts;
  totalProposals: number;
  pendingReview: number;
  totalHighSeverity: number;
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

export interface GovernanceFilters {
  stage?: string;
  severity?: string;
  riskLevel?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function buildActionTypeStats(name: string, actions: any[]): ActionTypeStats {
  const completed = actions.filter(a => a.status === "completed" || a.outcome_status === "success").length;
  const failed = actions.filter(a => a.status === "failed" || a.outcome_status === "failure").length;
  const blocked = actions.filter(a => a.status === "blocked").length;
  const recoveryCount = actions.filter(a => a.recovery_hook_id || a.recovery_type).length;
  return {
    name,
    total: actions.length,
    completed,
    failed,
    blocked,
    recoveryCount,
    successRate: actions.length > 0 ? completed / actions.length : 0,
  };
}

// ── Main Hook ────────────────────────────────────────────────────────────────

export function useGovernanceInsightsData(filters?: GovernanceFilters) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery<GovernanceData>({
    queryKey: ["governance-insights-data", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      const [
        actionsRes,
        approvalsRes,
        auditRes,
        canonProposalsRes,
        policyProposalsRes,
        agentSelProposalsRes,
        readinessProposalsRes,
        signalsRes,
        routingDecisionsRes,
        routingOutcomesRes,
        canonEntriesRes,
      ] = await Promise.all([
        supabase.from("action_registry_entries").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(500),
        supabase.from("action_approval_requests").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(500),
        supabase.from("action_audit_events").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(200),
        supabase.from("canon_evolution_proposals" as any).select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(200),
        supabase.from("policy_tuning_proposals" as any).select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(200),
        supabase.from("agent_selection_tuning_proposals").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(200),
        supabase.from("readiness_tuning_proposals" as any).select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(200),
        supabase.from("learning_signals" as any).select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(500),
        supabase.from("agent_routing_decisions").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(300),
        supabase.from("agent_routing_outcomes").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(300),
        supabase.from("canon_entries" as any).select("id,title,type,status,usage_count,success_correlation").eq("organization_id", orgId!).limit(200),
      ]);

      const actions = (actionsRes.data as any[]) || [];
      const approvals = (approvalsRes.data as any[]) || [];
      const audit = (auditRes.data as any[]) || [];
      const canonProposals = (canonProposalsRes.data as any[]) || [];
      const policyProposals = (policyProposalsRes.data as any[]) || [];
      const agentSelProposals = (agentSelProposalsRes.data as any[]) || [];
      const readinessProposals = (readinessProposalsRes.data as any[]) || [];
      const signals = (signalsRes.data as any[]) || [];
      const routingDecisions = (routingDecisionsRes.data as any[]) || [];
      const routingOutcomes = (routingOutcomesRes.data as any[]) || [];
      const canonEntries = (canonEntriesRes.data as any[]) || [];

      // ── System Health ──
      const completedActions = actions.filter(a => a.status === "completed").length;
      const failedActions = actions.filter(a => a.status === "failed").length;
      const blockedActions = actions.filter(a => a.status === "blocked").length;
      const recoveryActivations = actions.filter(a => a.recovery_hook_id || a.recovery_type).length;
      const approvalRequired = actions.filter(a => a.requires_approval).length;

      const systemHealth: SystemHealthData = {
        totalActions: actions.length,
        completedActions,
        failedActions,
        blockedActions,
        recoveryActivations,
        humanApprovalRate: actions.length > 0 ? approvalRequired / actions.length : 0,
        successRate: actions.length > 0 ? completedActions / actions.length : 0,
        failureRate: actions.length > 0 ? failedActions / actions.length : 0,
        recoveryRate: actions.length > 0 ? recoveryActivations / actions.length : 0,
      };

      // ── Action Execution ──
      const byTriggerType: Record<string, any[]> = {};
      const byStage: Record<string, any[]> = {};
      for (const a of actions) {
        const tt = a.trigger_type || "unknown";
        const st = a.stage || "unknown";
        if (!byTriggerType[tt]) byTriggerType[tt] = [];
        byTriggerType[tt].push(a);
        if (!byStage[st]) byStage[st] = [];
        byStage[st].push(a);
      }

      const triggerStats = Object.entries(byTriggerType).map(([name, acts]) => buildActionTypeStats(name, acts));
      const stageStats = Object.entries(byStage).map(([name, acts]) => buildActionTypeStats(name, acts));

      const actionExecution: ActionExecutionData = {
        byTriggerType: Object.fromEntries(triggerStats.map(s => [s.name, s])),
        byStage: Object.fromEntries(stageStats.map(s => [s.name, s])),
        topFailures: triggerStats.filter(s => s.failed > 0).sort((a, b) => b.failed - a.failed).slice(0, 5),
        topRecoveryTriggers: triggerStats.filter(s => s.recoveryCount > 0).sort((a, b) => b.recoveryCount - a.recoveryCount).slice(0, 5),
        requiresApproval: approvalRequired,
        recentActions: actions.slice(0, 10),
      };

      // ── Agent Performance ──
      const agentMap: Record<string, { decisions: any[]; outcomes: any[] }> = {};
      const outcomeByDecision = new Map(routingOutcomes.map((o: any) => [o.decision_id, o]));

      for (const d of routingDecisions) {
        const key = d.chosen_agent_id || d.chosen_capability || "unknown";
        if (!agentMap[key]) agentMap[key] = { decisions: [], outcomes: [] };
        agentMap[key].decisions.push(d);
        const outcome = outcomeByDecision.get(d.id);
        if (outcome) agentMap[key].outcomes.push(outcome);
      }

      const agentStats: AgentDecisionStats[] = Object.entries(agentMap).map(([agentId, data]) => {
        const successCount = data.outcomes.filter((o: any) => o.success === true).length;
        const failureCount = data.outcomes.filter((o: any) => o.success === false).length;
        const avgConf = data.decisions.length > 0
          ? data.decisions.reduce((sum: number, d: any) => sum + (d.confidence_score || 0), 0) / data.decisions.length
          : 0;
        return {
          agentId,
          capability: data.decisions[0]?.chosen_capability || "unknown",
          totalDecisions: data.decisions.length,
          successCount,
          failureCount,
          avgConfidence: avgConf,
          successRate: data.outcomes.length > 0 ? successCount / data.outcomes.length : 0,
        };
      });

      const agentPerformance: AgentPerformanceData = {
        decisions: agentStats.sort((a, b) => b.totalDecisions - a.totalDecisions),
        totalDecisions: routingDecisions.length,
        avgConfidence: routingDecisions.length > 0
          ? routingDecisions.reduce((s: number, d: any) => s + (d.confidence_score || 0), 0) / routingDecisions.length
          : 0,
        topPerforming: agentStats.filter(a => a.successRate >= 0.7 && a.totalDecisions >= 2).sort((a, b) => b.successRate - a.successRate).slice(0, 5),
        needsAttention: agentStats.filter(a => a.failureCount > 0 || a.successRate < 0.5).sort((a, b) => b.failureCount - a.failureCount).slice(0, 5),
      };

      // ── Canon Usage ──
      const canonUsage: CanonUsageData = {
        totalEntries: canonEntries.length,
        activeEntries: canonEntries.filter((e: any) => e.status === "active" || e.status === "validated").length,
        deprecatedEntries: canonEntries.filter((e: any) => e.status === "deprecated").length,
        topUsedPatterns: canonEntries
          .filter((e: any) => (e.usage_count || 0) > 0)
          .sort((a: any, b: any) => (b.usage_count || 0) - (a.usage_count || 0))
          .slice(0, 5)
          .map((e: any) => ({
            id: e.id, title: e.title || "Untitled", type: e.type || "pattern",
            status: e.status || "active", usageCount: e.usage_count || 0,
            successCorrelation: e.success_correlation || 0,
          })),
        underusedPatterns: canonEntries
          .filter((e: any) => (e.usage_count || 0) === 0 && e.status !== "deprecated")
          .slice(0, 5)
          .map((e: any) => ({
            id: e.id, title: e.title || "Untitled", type: e.type || "pattern",
            status: e.status || "active", usageCount: 0, successCorrelation: 0,
          })),
        failureLinkedPatterns: canonEntries
          .filter((e: any) => (e.success_correlation || 0) < 0.3 && (e.usage_count || 0) > 0)
          .slice(0, 5)
          .map((e: any) => ({
            id: e.id, title: e.title || "Untitled", type: e.type || "pattern",
            status: e.status || "active", usageCount: e.usage_count || 0,
            successCorrelation: e.success_correlation || 0,
          })),
      };

      // ── Policy Impact ──
      const policyBlockedCount = actions.filter(a => a.status === "blocked" && a.policy_decision_id).length;
      const policyApprovalCount = actions.filter(a => a.requires_approval && a.policy_decision_id).length;
      const riskLevels: Record<string, number> = {};
      const policyStages: Record<string, number> = {};
      for (const a of actions) {
        if (a.policy_decision_id) {
          const rl = a.risk_level || "unknown";
          riskLevels[rl] = (riskLevels[rl] || 0) + 1;
          const st = a.stage || "unknown";
          policyStages[st] = (policyStages[st] || 0) + 1;
        }
      }

      const policyImpact: PolicyImpactData = {
        totalEnforcements: actions.filter(a => a.policy_decision_id).length,
        blockedByPolicy: policyBlockedCount,
        approvalRequired: policyApprovalCount,
        overrideCount: approvals.filter((a: any) => a.status === "approved" && a.decision_notes?.toLowerCase().includes("override")).length,
        byRiskLevel: riskLevels,
        byStage: policyStages,
      };

      // ── Readiness ──
      const readinessActions = actions.filter(a => a.stage && (a.status === "blocked" || a.status === "completed"));
      const readinessStages: Record<string, { passed: number; blocked: number }> = {};
      for (const a of readinessActions) {
        const st = a.stage || "unknown";
        if (!readinessStages[st]) readinessStages[st] = { passed: 0, blocked: 0 };
        if (a.status === "completed") readinessStages[st].passed++;
        if (a.status === "blocked") readinessStages[st].blocked++;
      }

      const readinessBlockers: ReadinessBlocker[] = Object.entries(readinessStages)
        .filter(([, v]) => v.blocked > 0)
        .map(([stage, v]) => ({ stage, reason: "Stage progression blocked", count: v.blocked }))
        .sort((a, b) => b.count - a.count);

      const readiness: ReadinessData = {
        totalChecks: readinessActions.length,
        passed: readinessActions.filter(a => a.status === "completed").length,
        blocked: readinessActions.filter(a => a.status === "blocked").length,
        topBlockers: readinessBlockers.slice(0, 5),
        byStage: readinessStages,
      };

      // ── Recovery ──
      const recoveryActions = actions.filter(a => a.recovery_hook_id || a.recovery_type);
      const recoveryByType: Record<string, number> = {};
      for (const a of recoveryActions) {
        const rt = a.recovery_type || "unknown";
        recoveryByType[rt] = (recoveryByType[rt] || 0) + 1;
      }
      const successfulRecoveries = recoveryActions.filter(a => a.outcome_status === "success" || a.status === "completed").length;

      const recoveryPatternMap = new Map<string, RecoveryPattern>();
      for (const a of recoveryActions) {
        const key = `${a.recovery_type || "unknown"}-${a.stage || "unknown"}`;
        const existing = recoveryPatternMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          recoveryPatternMap.set(key, {
            type: a.recovery_type || "unknown",
            stage: a.stage || "unknown",
            count: 1,
            successRate: 0,
          });
        }
      }

      const recoveryData: RecoveryData = {
        totalActivations: recoveryActions.length,
        successfulRecoveries,
        failedRecoveries: recoveryActions.length - successfulRecoveries,
        successRate: recoveryActions.length > 0 ? successfulRecoveries / recoveryActions.length : 0,
        byType: recoveryByType,
        topPatterns: Array.from(recoveryPatternMap.values()).sort((a, b) => b.count - a.count).slice(0, 5),
      };

      // ── Learning Signals ──
      const signalBySeverity: Record<string, number> = {};
      const signalByType: Record<string, number> = {};
      const signalByTarget: Record<string, number> = {};
      for (const s of signals) {
        const sev = s.severity || "info";
        signalBySeverity[sev] = (signalBySeverity[sev] || 0) + 1;
        const st = s.signal_type || "unknown";
        signalByType[st] = (signalByType[st] || 0) + 1;
        const rt = s.routing_target || "unknown";
        signalByTarget[rt] = (signalByTarget[rt] || 0) + 1;
      }

      const learningSignalsData: LearningSignalsData = {
        total: signals.length,
        highSeverity: signals.filter((s: any) => s.severity === "critical" || s.severity === "high").length,
        bySeverity: signalBySeverity,
        bySignalType: signalByType,
        byRoutingTarget: signalByTarget,
        recentSignals: signals.slice(0, 10),
      };

      // ── Proposals ──
      const ce = mapProposals(canonProposals);
      const pt = mapProposals(policyProposals);
      const ast = mapProposals(agentSelProposals);
      const rt2 = mapProposals(readinessProposals);

      const proposals: ProposalsData = {
        canonEvolution: ce,
        policyTuning: pt,
        agentSelectionTuning: ast,
        readinessTuning: rt2,
        totalProposals: ce.total + pt.total + ast.total + rt2.total,
        pendingReview: ce.proposed + ce.under_review + pt.proposed + pt.under_review + ast.proposed + ast.under_review + rt2.proposed + rt2.under_review,
        totalHighSeverity: ce.highSeverity + pt.highSeverity + ast.highSeverity + rt2.highSeverity,
      };

      // ── Friction Patterns ──
      const frictionMap = new Map<string, FrictionPattern>();
      for (const a of actions.filter(act => act.status === "blocked")) {
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

      // Rejection friction from approvals
      const rejectedApprovals = approvals.filter((a: any) => a.status === "rejected");
      const rejectionByStage: Record<string, any[]> = {};
      for (const a of rejectedApprovals) {
        const key = a.stage || "unknown";
        if (!rejectionByStage[key]) rejectionByStage[key] = [];
        rejectionByStage[key].push(a);
      }
      for (const [stage, apps] of Object.entries(rejectionByStage)) {
        if (apps.length >= 2) {
          frictionMap.set(`rejection-${stage}`, {
            id: `rejection-${stage}`,
            type: "repeated_approval_rejection_pattern",
            stage,
            severity: "high",
            count: apps.length,
            summary: `Repeated approval rejections in ${stage} stage (${apps.length}x)`,
            linkedProposalIds: [],
            linkedActionIds: apps.map(a => a.action_id),
          });
        }
      }

      let patterns = Array.from(frictionMap.values());
      if (filters?.stage) patterns = patterns.filter(p => p.stage === filters.stage);
      if (filters?.severity) patterns = patterns.filter(p => p.severity === filters.severity);

      return {
        systemHealth,
        actionExecution,
        agentPerformance,
        canonUsage,
        policyImpact,
        readiness,
        recovery: recoveryData,
        learningSignals: learningSignalsData,
        proposals,
        frictionPatterns: patterns.sort((a, b) => b.count - a.count).slice(0, 20),
      };
    },
    staleTime: 1000 * 60 * 2,
  });
}
