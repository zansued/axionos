/**
 * useCanonSelfImprovement — Sprint 209
 * Proposes, scores, and manages canon evolution based on operational evidence.
 * Self-improving but NOT self-authorizing — high-impact changes require human review.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───

export type EvolutionAction =
  | "reinforce"
  | "deprecate"
  | "supersede"
  | "merge"
  | "revise"
  | "archive"
  | "flag_conflict"
  | "flag_weak";

export type ReviewStatus = "pending" | "under_review" | "approved" | "rejected" | "deferred";
export type ImpactLevel = "low" | "medium" | "high" | "critical";

export const EVOLUTION_ACTION_LABELS: Record<EvolutionAction, string> = {
  reinforce: "Reinforce",
  deprecate: "Deprecate",
  supersede: "Supersede",
  merge: "Merge",
  revise: "Revise",
  archive: "Archive",
  flag_conflict: "Flag Conflict",
  flag_weak: "Flag Weak",
};

export const IMPACT_LEVEL_LABELS: Record<ImpactLevel, string> = {
  low: "Low Impact",
  medium: "Medium Impact",
  high: "High Impact",
  critical: "Critical Impact",
};

export interface EvolutionProposal {
  id: string;
  organization_id: string;
  target_canon_entry_id: string | null;
  title: string;
  proposal_type: string;
  justification: string | null;
  decision_notes: string | null;
  status: string;
  impact_level: string;
  confidence_score: number;
  urgency_score: number;
  priority_score: number;
  risk_score_v2: number;
  evidence_summary: string;
  evidence_sources: unknown;
  feedback_signal_count: number;
  requires_human_review: boolean;
  auto_approvable: boolean;
  blocked: boolean;
  block_reason: string | null;
  proposal_source: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  executed: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface ProposalInput {
  targetCanonEntryId?: string;
  targetTitle?: string;
  action: EvolutionAction;
  title: string;
  rationale: string;
  proposedChanges?: Record<string, unknown>;
  evidenceSummary?: string;
  evidenceSources?: unknown[];
  feedbackSignalCount?: number;
  minedPatternRefs?: string[];
  secondaryEntryIds?: string[];
}

// ─── Scoring ───

const ACTION_IMPACT_MAP: Record<EvolutionAction, ImpactLevel> = {
  reinforce: "low",
  flag_weak: "low",
  flag_conflict: "medium",
  revise: "medium",
  deprecate: "high",
  merge: "high",
  supersede: "high",
  archive: "critical",
};

const ACTION_AUTO_APPROVABLE: Record<EvolutionAction, boolean> = {
  reinforce: true,
  flag_weak: false,
  flag_conflict: false,
  revise: false,
  deprecate: false,
  merge: false,
  supersede: false,
  archive: false,
};

const MAX_PROPOSALS_PER_DAY = 20;

function scoreProposal(input: ProposalInput): {
  impactLevel: ImpactLevel;
  confidence: number;
  urgency: number;
  priority: number;
  risk: number;
  requiresHumanReview: boolean;
  autoApprovable: boolean;
} {
  const impactLevel = ACTION_IMPACT_MAP[input.action];
  const impactWeight = { low: 0.2, medium: 0.5, high: 0.8, critical: 1.0 }[impactLevel];

  // Evidence-based confidence
  const evidenceScore = Math.min(1, (input.feedbackSignalCount ?? 0) / 10);
  const patternScore = Math.min(1, (input.minedPatternRefs?.length ?? 0) / 3);
  const confidence = evidenceScore * 0.6 + patternScore * 0.4;

  // Urgency based on signal density
  const urgency = Math.min(1, (input.feedbackSignalCount ?? 0) / 20);

  // Priority = blend
  const priority = confidence * 0.4 + urgency * 0.3 + impactWeight * 0.3;

  // Risk proportional to impact
  const risk = impactWeight * (1 - confidence * 0.5);

  // Only low-impact reinforcements can auto-approve
  const autoApprovable = ACTION_AUTO_APPROVABLE[input.action] && confidence >= 0.7;
  const requiresHumanReview = !autoApprovable || impactLevel === "high" || impactLevel === "critical";

  return { impactLevel, confidence, urgency, priority, risk, requiresHumanReview, autoApprovable };
}

// ─── Hook ───

export function useCanonSelfImprovement() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["canon-evolution-proposals"] });
  };

  // ─── Proposals ───
  const proposalsQuery = useQuery({
    queryKey: ["canon-evolution-proposals", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("canon_evolution_proposals")
        .select("*")
        .eq("organization_id", orgId)
        .order("priority_score", { ascending: false });
      if (error) throw error;
      return (data || []) as EvolutionProposal[];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  // ─── Create proposal with rate limiting ───
  const createProposal = useMutation({
    mutationFn: async (input: ProposalInput) => {
      if (!orgId) throw new Error("No organization");

      // Rate limit check
      const windowStart = new Date();
      windowStart.setHours(0, 0, 0, 0);
      const { data: rateData } = await supabase
        .from("canon_evolution_rate_limits")
        .select("proposal_count")
        .eq("organization_id", orgId)
        .eq("window_start", windowStart.toISOString())
        .maybeSingle();

      if (rateData && (rateData as any).proposal_count >= MAX_PROPOSALS_PER_DAY) {
        throw new Error(`Daily proposal limit (${MAX_PROPOSALS_PER_DAY}) reached. Try again tomorrow.`);
      }

      const scoring = scoreProposal(input);

      const { data, error } = await supabase
        .from("canon_evolution_proposals")
        .insert({
          organization_id: orgId,
          target_canon_entry_id: input.targetCanonEntryId || null,
          title: input.title,
          proposal_type: input.action,
          justification: input.rationale,
          status: "proposed",
          evidence_summary: input.evidenceSummary || "",
          evidence_sources: (input.evidenceSources || []) as any,
          feedback_signal_count: input.feedbackSignalCount || 0,
          mined_pattern_refs: input.minedPatternRefs || [],
          secondary_entry_ids: input.secondaryEntryIds || [],
          impact_level: scoring.impactLevel,
          confidence_score: scoring.confidence,
          urgency_score: scoring.urgency,
          priority_score: scoring.priority,
          risk_score_v2: scoring.risk,
          requires_human_review: scoring.requiresHumanReview,
          auto_approvable: scoring.autoApprovable,
          proposal_source: "self-improving-engine",
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Update rate limit
      await supabase
        .from("canon_evolution_rate_limits")
        .upsert({
          organization_id: orgId,
          window_start: windowStart.toISOString(),
          proposal_count: (rateData ? (rateData as any).proposal_count : 0) + 1,
        } as any, { onConflict: "organization_id,window_start" });

      return { proposal: data, scoring };
    },
    onSuccess: (result) => {
      const s = result.scoring;
      toast({
        title: "Evolution proposal created",
        description: `Impact: ${s.impactLevel} | Priority: ${s.priority.toFixed(2)} | ${s.requiresHumanReview ? "Needs review" : "Auto-approvable"}`,
      });
      invalidate();
    },
    onError: (e: any) => {
      toast({ title: "Proposal failed", description: e.message, variant: "destructive" });
    },
  });

  // ─── Review proposal ───
  const reviewProposal = useMutation({
    mutationFn: async ({ proposalId, decision, notes }: {
      proposalId: string;
      decision: "approved" | "rejected" | "deferred";
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("canon_evolution_proposals")
        .update({
          status: decision,
          decision_notes: notes || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Proposal reviewed" });
      invalidate();
    },
  });

  // ─── Block proposal ───
  const blockProposal = useMutation({
    mutationFn: async ({ proposalId, reason }: { proposalId: string; reason: string }) => {
      const { error } = await supabase
        .from("canon_evolution_proposals")
        .update({
          blocked: true,
          block_reason: reason,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Proposal blocked" });
      invalidate();
    },
  });

  // ─── Stats ───
  const proposals = proposalsQuery.data || [];
  const stats = {
    total: proposals.length,
    pending: proposals.filter((p) => p.status === "proposed" || p.status === "pending").length,
    underReview: proposals.filter((p) => p.status === "under_review").length,
    approved: proposals.filter((p) => p.status === "approved").length,
    rejected: proposals.filter((p) => p.status === "rejected").length,
    blocked: proposals.filter((p) => p.blocked).length,
    byAction: proposals.reduce<Record<string, number>>((acc, p) => {
      acc[p.proposal_type] = (acc[p.proposal_type] || 0) + 1;
      return acc;
    }, {}),
    byImpact: proposals.reduce<Record<string, number>>((acc, p) => {
      acc[p.impact_level] = (acc[p.impact_level] || 0) + 1;
      return acc;
    }, {}),
    avgPriority: proposals.length
      ? proposals.reduce((s, p) => s + p.priority_score, 0) / proposals.length
      : 0,
  };

  return {
    proposals,
    proposalsLoading: proposalsQuery.isLoading,
    createProposal,
    reviewProposal,
    blockProposal,
    stats,
    invalidate,
    scoreProposal,
  };
}
