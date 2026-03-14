/**
 * useAgentLearningFeedback — Sprint 207
 * Structured feedback loop connecting agent execution outcomes to canon/skill confidence.
 * Includes scoring model, noise safeguards, and read-model for learning outcomes.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───

export type FeedbackCategory =
  | "successful_application"
  | "neutral_application"
  | "misapplied_pattern"
  | "conflict_detected"
  | "insufficient_context"
  | "superseded_guidance_detected";

export type ImpactDirection = "reinforce" | "degrade" | "neutral";

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  successful_application: "Successful Application",
  neutral_application: "Neutral Application",
  misapplied_pattern: "Misapplied Pattern",
  conflict_detected: "Conflict Detected",
  insufficient_context: "Insufficient Context",
  superseded_guidance_detected: "Superseded Guidance",
};

export const FEEDBACK_CATEGORY_IMPACT: Record<FeedbackCategory, ImpactDirection> = {
  successful_application: "reinforce",
  neutral_application: "neutral",
  misapplied_pattern: "degrade",
  conflict_detected: "degrade",
  insufficient_context: "neutral",
  superseded_guidance_detected: "degrade",
};

export interface FeedbackInput {
  canonEntryId?: string;
  skillId?: string;
  graphNodeId?: string;
  agentId?: string;
  agentType?: string;
  initiativeId?: string;
  storyId?: string;
  subtaskId?: string;
  pipelineStage?: string;
  executionContext?: Record<string, unknown>;
  category: FeedbackCategory;
  outcomeQualityScore?: number;
  relevanceScore?: number;
  contextMatchScore?: number;
  feedbackSource?: string;
  evidenceRefs?: unknown[];
}

export interface FeedbackRecord {
  id: string;
  organization_id: string;
  canon_entry_id: string | null;
  skill_id: string | null;
  agent_type: string;
  pipeline_stage: string;
  category: FeedbackCategory;
  impact_direction: ImpactDirection;
  applied_confidence_delta: number;
  outcome_quality_score: number;
  relevance_score: number;
  context_match_score: number;
  noise_score: number;
  suppressed: boolean;
  signal_strength: number;
  feedback_source: string;
  created_at: string;
}

export interface ConfidenceLedgerEntry {
  id: string;
  canon_entry_id: string;
  total_feedback_count: number;
  reinforcement_count: number;
  degradation_count: number;
  neutral_count: number;
  cumulative_delta: number;
  current_effective_confidence: number;
  last_updated_at: string;
}

// ─── Scoring Model ───

const CONFIDENCE_DELTA_CAPS: Record<ImpactDirection, { min: number; max: number }> = {
  reinforce: { min: 0.005, max: 0.05 },
  degrade: { min: -0.08, max: -0.01 },
  neutral: { min: 0, max: 0 },
};

const NOISE_THRESHOLD = 0.6;
const MIN_SIGNAL_STRENGTH = 0.2;

/**
 * Compute confidence delta with safeguards.
 * Factors: outcome quality, relevance, context match, signal strength.
 * Applies noise suppression and caps.
 */
function computeFeedbackScoring(input: FeedbackInput): {
  impactDirection: ImpactDirection;
  rawDelta: number;
  appliedDelta: number;
  noiseScore: number;
  suppressed: boolean;
  suppressionReason: string | null;
  signalStrength: number;
} {
  const direction = FEEDBACK_CATEGORY_IMPACT[input.category];
  const outcome = input.outcomeQualityScore ?? 0.5;
  const relevance = input.relevanceScore ?? 0.5;
  const contextMatch = input.contextMatchScore ?? 0.5;

  // Signal strength = weighted average of scoring dimensions
  const signalStrength = outcome * 0.4 + relevance * 0.35 + contextMatch * 0.25;

  // Noise score: low signal + low context match = noisy
  const noiseScore = Math.max(0, 1 - signalStrength);

  // Suppression checks
  let suppressed = false;
  let suppressionReason: string | null = null;

  if (noiseScore > NOISE_THRESHOLD) {
    suppressed = true;
    suppressionReason = `Noise score ${noiseScore.toFixed(2)} exceeds threshold ${NOISE_THRESHOLD}`;
  }
  if (signalStrength < MIN_SIGNAL_STRENGTH) {
    suppressed = true;
    suppressionReason = `Signal strength ${signalStrength.toFixed(2)} below minimum ${MIN_SIGNAL_STRENGTH}`;
  }

  // Compute raw delta
  const caps = CONFIDENCE_DELTA_CAPS[direction];
  let rawDelta = 0;

  if (direction === "reinforce") {
    rawDelta = signalStrength * caps.max;
  } else if (direction === "degrade") {
    rawDelta = signalStrength * caps.min; // negative
  }

  // Apply: suppressed feedback has zero applied delta
  const appliedDelta = suppressed ? 0 : rawDelta;

  return {
    impactDirection: direction,
    rawDelta,
    appliedDelta,
    noiseScore,
    suppressed,
    suppressionReason,
    signalStrength,
  };
}

// ─── Hook ───

export function useAgentLearningFeedback() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["agent-learning-feedback"] });
    qc.invalidateQueries({ queryKey: ["agent-learning-ledger"] });
    qc.invalidateQueries({ queryKey: ["agent-learning-stats"] });
  };

  // ─── Recent feedback ───
  const feedbackQuery = useQuery({
    queryKey: ["agent-learning-feedback", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("agent_learning_feedback")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as FeedbackRecord[];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  // ─── Confidence ledger ───
  const ledgerQuery = useQuery({
    queryKey: ["agent-learning-ledger", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("agent_learning_confidence_ledger")
        .select("*")
        .eq("organization_id", orgId)
        .order("last_updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ConfidenceLedgerEntry[];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  // ─── Submit feedback ───
  const submitFeedback = useMutation({
    mutationFn: async (input: FeedbackInput) => {
      if (!orgId) throw new Error("No organization");

      const scoring = computeFeedbackScoring(input);

      const { data, error } = await supabase
        .from("agent_learning_feedback")
        .insert({
          organization_id: orgId,
          canon_entry_id: input.canonEntryId || null,
          skill_id: input.skillId || null,
          graph_node_id: input.graphNodeId || null,
          agent_id: input.agentId || "unknown",
          agent_type: input.agentType || "unknown",
          initiative_id: input.initiativeId || null,
          story_id: input.storyId || null,
          subtask_id: input.subtaskId || null,
          pipeline_stage: input.pipelineStage || "unknown",
          execution_context: (input.executionContext || {}) as any,
          category: input.category as any,
          impact_direction: scoring.impactDirection as any,
          raw_confidence_delta: scoring.rawDelta,
          applied_confidence_delta: scoring.appliedDelta,
          outcome_quality_score: input.outcomeQualityScore ?? 0.5,
          relevance_score: input.relevanceScore ?? 0.5,
          context_match_score: input.contextMatchScore ?? 0.5,
          noise_score: scoring.noiseScore,
          suppressed: scoring.suppressed,
          suppression_reason: scoring.suppressionReason,
          signal_strength: scoring.signalStrength,
          feedback_source: input.feedbackSource || "runtime",
          evidence_refs: (input.evidenceRefs || []) as any,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return { feedback: data, scoring };
    },
    onSuccess: (result) => {
      const verb = result.scoring.suppressed ? "recorded (suppressed)" : "applied";
      toast({
        title: "Feedback " + verb,
        description: `Δ confidence: ${result.scoring.appliedDelta.toFixed(4)}`,
      });
      invalidate();
    },
    onError: (e: any) => {
      toast({ title: "Feedback failed", description: e.message, variant: "destructive" });
    },
  });

  // ─── Aggregated stats ───
  const stats = {
    totalFeedback: feedbackQuery.data?.length ?? 0,
    activeFeedback: feedbackQuery.data?.filter((f) => !f.suppressed).length ?? 0,
    suppressedFeedback: feedbackQuery.data?.filter((f) => f.suppressed).length ?? 0,
    byCategory: (feedbackQuery.data || []).reduce<Record<string, number>>((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {}),
    byDirection: (feedbackQuery.data || []).reduce<Record<string, number>>((acc, f) => {
      if (!f.suppressed) acc[f.impact_direction] = (acc[f.impact_direction] || 0) + 1;
      return acc;
    }, {}),
    entriesWithFeedback: ledgerQuery.data?.length ?? 0,
    avgEffectiveConfidence: ledgerQuery.data?.length
      ? ledgerQuery.data.reduce((s, l) => s + l.current_effective_confidence, 0) / ledgerQuery.data.length
      : 0,
  };

  return {
    feedback: feedbackQuery.data || [],
    ledger: ledgerQuery.data || [],
    feedbackLoading: feedbackQuery.isLoading,
    ledgerLoading: ledgerQuery.isLoading,
    submitFeedback,
    stats,
    invalidate,
    // Export for testing/external use
    computeFeedbackScoring,
  };
}
