import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export interface DeliveryGovernanceData {
  compliance: {
    score: number;
    totalActions: number;
    compliantActions: number;
    policyEnforced: number;
    blockedByPolicy: number;
    approvalRate: number;
  };
  approvalQueue: ApprovalItem[];
  auditTrail: AuditItem[];
  autonomy: {
    avgLevel: number;
    domains: AutonomyDomain[];
  };
  policies: PolicySummary[];
  actionsByStage: Record<string, { total: number; success: number; failed: number }>;
}

export interface ApprovalItem {
  id: string;
  actionId: string;
  reason: string;
  riskLevel: string;
  status: string;
  executionMode: string;
  triggerType: string;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  explanation: string | null;
}

export interface AuditItem {
  id: string;
  actionId: string;
  eventType: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  actorType: string | null;
  createdAt: string;
}

export interface AutonomyDomain {
  id: string;
  domainName: string;
  currentLevel: number;
  maxLevel: number;
  status: string;
}

export interface PolicySummary {
  stage: string;
  totalActions: number;
  enforced: number;
  blocked: number;
  approvalRequired: number;
  successRate: number;
}

export function useDeliveryGovernance() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery<DeliveryGovernanceData>({
    queryKey: ["delivery-governance", orgId],
    enabled: !!orgId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const [actionsRes, approvalsRes, auditRes, autonomyRes] = await Promise.all([
        supabase.from("action_registry_entries").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(500),
        supabase.from("action_approval_requests").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(200),
        supabase.from("action_audit_events").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(100),
        supabase.from("autonomy_domains" as any).select("*").eq("organization_id", orgId!).limit(50),
      ]);

      const actions = (actionsRes.data as any[]) || [];
      const approvals = (approvalsRes.data as any[]) || [];
      const audit = (auditRes.data as any[]) || [];
      const autonomyDomains = (autonomyRes.data as any[]) || [];

      // Compliance
      const completed = actions.filter(a => a.status === "completed").length;
      const failed = actions.filter(a => a.status === "failed").length;
      const blocked = actions.filter(a => a.status === "blocked").length;
      const policyEnforced = actions.filter(a => a.policy_decision_id).length;
      const blockedByPolicy = actions.filter(a => a.status === "blocked" && a.policy_decision_id).length;
      const approvalRequired = actions.filter(a => a.requires_approval).length;
      const approvalDecided = approvals.filter(a => a.status === "approved" || a.status === "rejected").length;
      const complianceScore = actions.length > 0
        ? Math.round(((completed + blocked) / actions.length) * 100)
        : 100;

      // Approval Queue
      const approvalQueue: ApprovalItem[] = approvals.map((a: any) => ({
        id: a.id,
        actionId: a.action_id,
        reason: a.reason || "—",
        riskLevel: a.risk_level || "low",
        status: a.status || "pending",
        executionMode: a.execution_mode || "—",
        triggerType: a.trigger_type || "—",
        createdAt: a.created_at,
        decidedAt: a.decided_at,
        decidedBy: a.decided_by,
        explanation: a.explanation,
      }));

      // Audit Trail
      const auditTrail: AuditItem[] = audit.map((a: any) => ({
        id: a.id,
        actionId: a.action_id,
        eventType: a.event_type || "unknown",
        previousStatus: a.previous_status,
        newStatus: a.new_status,
        reason: a.reason,
        actorType: a.actor_type,
        createdAt: a.created_at,
      }));

      // Autonomy
      const domains: AutonomyDomain[] = autonomyDomains.map((d: any) => ({
        id: d.id || d.domain_id,
        domainName: d.domain_name || d.name || "—",
        currentLevel: d.current_level ?? d.autonomy_level ?? 0,
        maxLevel: d.max_level ?? 5,
        status: d.status || "active",
      }));
      const avgLevel = domains.length > 0
        ? domains.reduce((s, d) => s + d.currentLevel, 0) / domains.length
        : 0;

      // Policies by stage
      const stageMap: Record<string, any[]> = {};
      for (const a of actions) {
        const st = a.stage || "unknown";
        if (!stageMap[st]) stageMap[st] = [];
        stageMap[st].push(a);
      }
      const policies: PolicySummary[] = Object.entries(stageMap).map(([stage, acts]) => {
        const s = acts.filter(a => a.status === "completed").length;
        const f = acts.filter(a => a.status === "failed").length;
        const b = acts.filter(a => a.status === "blocked").length;
        const e = acts.filter(a => a.policy_decision_id).length;
        const ar = acts.filter(a => a.requires_approval).length;
        return {
          stage,
          totalActions: acts.length,
          enforced: e,
          blocked: b,
          approvalRequired: ar,
          successRate: acts.length > 0 ? s / acts.length : 0,
        };
      }).sort((a, b) => b.totalActions - a.totalActions);

      const actionsByStage: Record<string, { total: number; success: number; failed: number }> = {};
      for (const [stage, acts] of Object.entries(stageMap)) {
        actionsByStage[stage] = {
          total: acts.length,
          success: acts.filter(a => a.status === "completed").length,
          failed: acts.filter(a => a.status === "failed").length,
        };
      }

      return {
        compliance: {
          score: complianceScore,
          totalActions: actions.length,
          compliantActions: completed + blocked,
          policyEnforced,
          blockedByPolicy,
          approvalRate: approvalRequired > 0 ? approvalDecided / approvalRequired : 1,
        },
        approvalQueue,
        auditTrail,
        autonomy: { avgLevel, domains },
        policies,
        actionsByStage,
      };
    },
  });
}
