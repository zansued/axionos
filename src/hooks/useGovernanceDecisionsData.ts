import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

// ── Types ──────────────────────────────────────────────────────────────────

export type DecisionStatus =
  | "pending_review"
  | "in_review"
  | "awaiting_evidence"
  | "deferred"
  | "approved"
  | "rejected"
  | "needs_revision";

export type ProposalSource =
  | "canon_evolution"
  | "policy_tuning"
  | "agent_selection_tuning"
  | "readiness_tuning"
  | "knowledge_renewal";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface GovernanceProposal {
  id: string;
  source: ProposalSource;
  type: string;
  title: string;
  description: string;
  status: DecisionStatus;
  confidenceScore: number;
  severity: RiskLevel;
  impactLevel: string;
  evidenceCompleteness: number;
  originatingSubsystem: string;
  createdAt: string;
  updatedAt: string;
  owner: string;
  reviewer: string | null;
  rationale: string;
  recommendation: string;
  evidenceSummary: string;
  linkedSignalIds: string[];
  linkedActionIds: string[];
  linkedApprovalIds: string[];
  assessment: ProposalAssessment;
  decisionHistory: DecisionLogEntry[];
  approvalRequirements: ApprovalRequirement[];
  handoffPreview: HandoffPreview | null;
  rawData: any;
}

export interface ProposalAssessment {
  operationalRisk: RiskLevel;
  governanceRisk: RiskLevel;
  stabilityRisk: RiskLevel;
  reversibility: "full" | "partial" | "irreversible";
  blastRadius: "local" | "subsystem" | "cross_system" | "global";
  humanOversightRequired: boolean;
}

export interface DecisionLogEntry {
  id: string;
  user: string;
  timestamp: string;
  action: string;
  notes: string;
}

export interface ApprovalRequirement {
  type: string;
  label: string;
  met: boolean;
  detail: string;
}

export interface HandoffPreview {
  targetWorkflow: string;
  targetDescription: string;
  steps: string[];
}

export interface DecisionOverview {
  pending: number;
  inReview: number;
  approvedThisPeriod: number;
  rejectedThisPeriod: number;
  deferred: number;
  awaitingEvidence: number;
  needsRevision: number;
  avgDecisionTimeHours: number;
  oldestPendingDays: number;
  highRiskPending: number;
}

export interface DecisionFilters {
  proposalType?: ProposalSource;
  status?: DecisionStatus;
  riskLevel?: RiskLevel;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapStatus(rawStatus: string): DecisionStatus {
  const mapping: Record<string, DecisionStatus> = {
    proposed: "pending_review",
    draft: "pending_review",
    submitted: "pending_review",
    under_review: "in_review",
    accepted: "approved",
    approved: "approved",
    rejected: "rejected",
    deferred: "deferred",
    archived: "rejected",
  };
  return mapping[rawStatus] || "pending_review";
}

function mapSeverity(sev: string): RiskLevel {
  if (sev === "critical") return "critical";
  if (sev === "high") return "high";
  if (sev === "medium") return "medium";
  return "low";
}

function inferAssessment(p: any, source: ProposalSource): ProposalAssessment {
  const conf = p.confidence ?? 0;
  const sev = mapSeverity(p.severity || "medium");
  const isHighRisk = sev === "critical" || sev === "high";
  return {
    operationalRisk: sev,
    governanceRisk: isHighRisk ? "high" : "medium",
    stabilityRisk: conf < 0.4 ? "high" : conf < 0.7 ? "medium" : "low",
    reversibility: source === "canon_evolution" ? "partial" : "full",
    blastRadius: source === "policy_tuning" ? "cross_system" : source === "canon_evolution" ? "subsystem" : "local",
    humanOversightRequired: isHighRisk || conf < 0.5,
  };
}

function inferHandoff(source: ProposalSource): HandoffPreview {
  const map: Record<ProposalSource, HandoffPreview> = {
    canon_evolution: {
      targetWorkflow: "Canon Evolution Pipeline",
      targetDescription: "Submit canon update to pattern library governance workflow",
      steps: ["Validate canon entry structure", "Submit to Canon Governance review", "Apply to Pattern Library if approved"],
    },
    policy_tuning: {
      targetWorkflow: "Policy Configuration Pipeline",
      targetDescription: "Send policy tuning to governance rule update workflow",
      steps: ["Validate policy rule changes", "Submit to Policy Governance review", "Update policy engine configuration"],
    },
    agent_selection_tuning: {
      targetWorkflow: "Agent Selection Tuning Pipeline",
      targetDescription: "Send agent routing changes to orchestrator tuning workflow",
      steps: ["Validate selection criteria changes", "Submit to routing review", "Update agent selection profiles"],
    },
    readiness_tuning: {
      targetWorkflow: "Readiness Rules Pipeline",
      targetDescription: "Send readiness threshold updates to readiness engine workflow",
      steps: ["Validate readiness rule changes", "Submit to readiness governance", "Update readiness engine configuration"],
    },
  };
  return map[source];
}

function buildProposal(raw: any, source: ProposalSource): GovernanceProposal {
  const status = mapStatus(raw.review_status || raw.status || "proposed");
  const severity = mapSeverity(raw.severity || "medium");
  const confidence = raw.confidence ?? 0;

  return {
    id: raw.id,
    source,
    type: raw.proposal_type || source,
    title: raw.recommendation || raw.title || `${source} proposal`,
    description: raw.rationale || raw.description || "",
    status,
    confidenceScore: confidence,
    severity,
    impactLevel: severity === "critical" ? "Critical" : severity === "high" ? "High" : severity === "medium" ? "Moderate" : "Low",
    evidenceCompleteness: confidence > 0.7 ? 0.9 : confidence > 0.4 ? 0.6 : 0.3,
    originatingSubsystem: source.replace(/_/g, " "),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at || raw.created_at,
    owner: raw.proposed_by_actor_type || "system",
    reviewer: null,
    rationale: raw.rationale || "",
    recommendation: raw.recommendation || "",
    evidenceSummary: raw.evidence_summary || "",
    linkedSignalIds: Array.isArray(raw.related_learning_signal_ids) ? raw.related_learning_signal_ids : [],
    linkedActionIds: Array.isArray(raw.related_action_ids) ? raw.related_action_ids : [],
    linkedApprovalIds: [],
    assessment: inferAssessment(raw, source),
    decisionHistory: [],
    approvalRequirements: [
      { type: "reviewer", label: "Reviewer assigned", met: false, detail: "At least one reviewer must be assigned" },
      { type: "evidence", label: "Evidence reviewed", met: confidence > 0.5, detail: `Confidence: ${(confidence * 100).toFixed(0)}%` },
      ...(severity === "critical" ? [{ type: "dual_approval", label: "Dual approval required", met: false, detail: "Critical severity requires two approvers" }] : []),
    ],
    handoffPreview: inferHandoff(source),
    rawData: raw,
  };
}

// ── Main Hook ──────────────────────────────────────────────────────────────

export function useGovernanceDecisionsData(filters?: DecisionFilters) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["governance-decisions", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      const [canonRes, policyRes, agentSelRes, readinessRes] = await Promise.all([
        supabase.from("canon_evolution_proposals" as any).select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(300),
        supabase.from("policy_tuning_proposals" as any).select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(300),
        supabase.from("agent_selection_tuning_proposals").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(300),
        supabase.from("readiness_tuning_proposals" as any).select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(300),
      ]);

      const allProposals: GovernanceProposal[] = [
        ...((canonRes.data as any[]) || []).map(p => buildProposal(p, "canon_evolution")),
        ...((policyRes.data as any[]) || []).map(p => buildProposal(p, "policy_tuning")),
        ...((agentSelRes.data as any[]) || []).map(p => buildProposal(p, "agent_selection_tuning")),
        ...((readinessRes.data as any[]) || []).map(p => buildProposal(p, "readiness_tuning")),
      ];

      // Apply filters
      let filtered = allProposals;
      if (filters?.proposalType) filtered = filtered.filter(p => p.source === filters.proposalType);
      if (filters?.status) filtered = filtered.filter(p => p.status === filters.status);
      if (filters?.riskLevel) filtered = filtered.filter(p => p.severity === filters.riskLevel);

      // Sort
      const sortBy = filters?.sortBy || "createdAt";
      const sortDir = filters?.sortDir || "desc";
      filtered.sort((a: any, b: any) => {
        const aVal = a[sortBy] ?? "";
        const bVal = b[sortBy] ?? "";
        if (sortDir === "asc") return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });

      // Overview
      const now = new Date();
      const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const overview: DecisionOverview = {
        pending: allProposals.filter(p => p.status === "pending_review").length,
        inReview: allProposals.filter(p => p.status === "in_review").length,
        approvedThisPeriod: allProposals.filter(p => p.status === "approved" && new Date(p.updatedAt) >= periodStart).length,
        rejectedThisPeriod: allProposals.filter(p => p.status === "rejected" && new Date(p.updatedAt) >= periodStart).length,
        deferred: allProposals.filter(p => p.status === "deferred").length,
        awaitingEvidence: allProposals.filter(p => p.status === "awaiting_evidence").length,
        needsRevision: allProposals.filter(p => p.status === "needs_revision").length,
        avgDecisionTimeHours: 0,
        oldestPendingDays: 0,
        highRiskPending: allProposals.filter(p => (p.status === "pending_review" || p.status === "in_review") && (p.severity === "critical" || p.severity === "high")).length,
      };

      const pendingProposals = allProposals.filter(p => p.status === "pending_review" || p.status === "in_review");
      if (pendingProposals.length > 0) {
        const oldest = pendingProposals.reduce((o, p) => (new Date(p.createdAt) < new Date(o.createdAt) ? p : o));
        overview.oldestPendingDays = Math.floor((now.getTime() - new Date(oldest.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      }

      return { proposals: filtered, overview, allProposals };
    },
    staleTime: 1000 * 60 * 2,
  });
}

// ── Decision Mutation (local state for now, production would call edge function) ──

export function useGovernanceDecisionAction() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();

  return useMutation({
    mutationFn: async (params: {
      proposalId: string;
      source: ProposalSource;
      action: "approve" | "reject" | "defer" | "request_revision";
      rationale: string;
      notes?: string;
    }) => {
      const statusMap: Record<string, string> = {
        approve: "accepted",
        reject: "rejected",
        defer: "deferred",
        request_revision: "proposed",
      };

      const tableName = {
        canon_evolution: "canon_evolution_proposals",
        policy_tuning: "policy_tuning_proposals",
        agent_selection_tuning: "agent_selection_tuning_proposals",
        readiness_tuning: "readiness_tuning_proposals",
      }[params.source];

      const { error } = await supabase
        .from(tableName as any)
        .update({ review_status: statusMap[params.action], updated_at: new Date().toISOString() } as any)
        .eq("id", params.proposalId)
        .eq("organization_id", currentOrg?.id!);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["governance-decisions"] });
      qc.invalidateQueries({ queryKey: ["governance-insights-data"] });
    },
  });
}
