import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import {
  type HandoffPackage,
  type HandoffStatus,
  type HandoffAuditEntry,
  type DownstreamReceipt,
  type ValidationCheck,
  computeValidationChecks,
  TARGET_WORKFLOW_MAP,
  HANDOFF_STATUS_DEFINITIONS,
} from "@/lib/governance-handoff-state-machine";

// ── Types ──────────────────────────────────────────────────────────────────

export interface HandoffOverview {
  awaitingHandoff: number;
  prepared: number;
  released: number;
  blocked: number;
  awaitingValidation: number;
  avgHoursToHandoff: number;
  oldestAwaitingDays: number;
  highRiskNotHandedOff: number;
}

export interface HandoffFilters {
  proposalType?: string;
  riskLevel?: string;
  handoffStatus?: HandoffStatus;
  targetWorkflow?: string;
}

// ── Build handoff from approved proposal ────────────────────────────────────

function buildHandoffFromProposal(raw: any, source: string): HandoffPackage {
  const status = raw.review_status || raw.status || "";
  // Only include approved proposals
  if (!["accepted", "approved"].includes(status)) return null as any;

  const workflow = TARGET_WORKFLOW_MAP[source];
  const handoffId = `ho-${raw.id.slice(0, 8)}`;
  const now = new Date().toISOString();

  return {
    handoffId,
    sourceProposalId: raw.id,
    proposalType: source,
    proposalTitle: raw.recommendation || raw.title || `${source} proposal`,
    handoffStatus: "awaiting_preparation",
    targetWorkflow: workflow?.workflowName || source,
    targetSubsystem: workflow?.subsystem || source,
    targetOwner: "",
    changeSummary: raw.recommendation || "",
    changeIntent: raw.rationale || "",
    scopeBoundaries: "",
    constraints: "",
    riskNotes: "",
    monitoringRequirements: "",
    validationRequirements: "",
    rollbackExpectations: "",
    releaseNotes: "",
    governanceRationale: raw.rationale || "",
    approvedAt: raw.updated_at || raw.created_at,
    approvalMode: raw.severity === "critical" ? "executive_escalation" : raw.severity === "high" ? "dual_approval" : "single_reviewer",
    approvers: [raw.proposed_by_actor_type || "system"],
    riskLevel: raw.severity || "medium",
    impactScope: source === "policy_tuning" ? "cross_system" : "subsystem",
    attachedEvidenceRefs: Array.isArray(raw.related_learning_signal_ids) ? raw.related_learning_signal_ids.slice(0, 3) : [],
    attachedGovernanceRefs: [raw.id],
    auditHistory: [
      {
        id: `${handoffId}-init`,
        timestamp: now,
        actor: "system",
        eventType: "handoff_created",
        fromStatus: "awaiting_preparation" as HandoffStatus,
        toStatus: "awaiting_preparation" as HandoffStatus,
        summary: "Handoff package created from approved governance decision.",
        notes: "",
      },
    ],
    releasedAt: null,
    releasedBy: null,
    downstreamReceipt: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ── Main Hook ──────────────────────────────────────────────────────────────

export function useGovernanceHandoffData(filters?: HandoffFilters) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["governance-handoff", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      // Fetch approved proposals from all 4 sources
      const [canonRes, policyRes, agentSelRes, readinessRes] = await Promise.all([
        supabase.from("canon_evolution_proposals" as any).select("*").eq("organization_id", orgId!).in("review_status", ["accepted", "approved"]).order("created_at", { ascending: false }).limit(200),
        supabase.from("policy_tuning_proposals" as any).select("*").eq("organization_id", orgId!).in("review_status", ["accepted", "approved"]).order("created_at", { ascending: false }).limit(200),
        supabase.from("agent_selection_tuning_proposals").select("*").eq("organization_id", orgId!).in("review_status", ["accepted", "approved"]).order("created_at", { ascending: false }).limit(200),
        supabase.from("readiness_tuning_proposals" as any).select("*").eq("organization_id", orgId!).in("review_status", ["accepted", "approved"]).order("created_at", { ascending: false }).limit(200),
      ]);

      const allHandoffs: HandoffPackage[] = [
        ...((canonRes.data as any[]) || []).map((p) => buildHandoffFromProposal(p, "canon_evolution")),
        ...((policyRes.data as any[]) || []).map((p) => buildHandoffFromProposal(p, "policy_tuning")),
        ...((agentSelRes.data as any[]) || []).map((p) => buildHandoffFromProposal(p, "agent_selection_tuning")),
        ...((readinessRes.data as any[]) || []).map((p) => buildHandoffFromProposal(p, "readiness_tuning")),
      ].filter(Boolean);

      // Apply filters
      let filtered = allHandoffs;
      if (filters?.proposalType) filtered = filtered.filter((h) => h.proposalType === filters.proposalType);
      if (filters?.riskLevel) filtered = filtered.filter((h) => h.riskLevel === filters.riskLevel);
      if (filters?.handoffStatus) filtered = filtered.filter((h) => h.handoffStatus === filters.handoffStatus);

      // Overview
      const now = new Date();
      const overview: HandoffOverview = {
        awaitingHandoff: allHandoffs.filter((h) => h.handoffStatus === "awaiting_preparation").length,
        prepared: allHandoffs.filter((h) => ["in_preparation", "awaiting_validation", "ready_for_release"].includes(h.handoffStatus)).length,
        released: allHandoffs.filter((h) => h.handoffStatus === "released" || h.handoffStatus === "acknowledged_downstream").length,
        blocked: allHandoffs.filter((h) => h.handoffStatus === "blocked").length,
        awaitingValidation: allHandoffs.filter((h) => h.handoffStatus === "awaiting_validation").length,
        avgHoursToHandoff: 0,
        oldestAwaitingDays: 0,
        highRiskNotHandedOff: allHandoffs.filter((h) => h.handoffStatus === "awaiting_preparation" && (h.riskLevel === "critical" || h.riskLevel === "high")).length,
      };

      if (allHandoffs.length > 0) {
        const awaiting = allHandoffs.filter((h) => h.handoffStatus === "awaiting_preparation");
        if (awaiting.length > 0) {
          const oldest = awaiting.reduce((o, h) => (new Date(h.approvedAt) < new Date(o.approvedAt) ? h : o));
          overview.oldestAwaitingDays = Math.floor((now.getTime() - new Date(oldest.approvedAt).getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      return { handoffs: filtered, allHandoffs, overview };
    },
    staleTime: 1000 * 60 * 2,
  });
}
