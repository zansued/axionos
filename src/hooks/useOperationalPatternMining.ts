/**
 * useOperationalPatternMining — Sprint 208
 * Detects recurring patterns from live execution, filters noise,
 * and proposes new canon candidates from operational evidence.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───

export type MinedPatternType =
  | "recurring_success"
  | "skill_combination"
  | "recurring_failure"
  | "improvised_method"
  | "bottleneck"
  | "emergent_convention";

export type MinedPatternStatus =
  | "detected"
  | "confirmed"
  | "candidate_proposed"
  | "promoted"
  | "dismissed"
  | "noise";

export const PATTERN_TYPE_LABELS: Record<MinedPatternType, string> = {
  recurring_success: "Recurring Success",
  skill_combination: "Skill Combination",
  recurring_failure: "Recurring Failure",
  improvised_method: "Improvised Method",
  bottleneck: "Bottleneck",
  emergent_convention: "Emergent Convention",
};

export const PATTERN_STATUS_LABELS: Record<MinedPatternStatus, string> = {
  detected: "Detected",
  confirmed: "Confirmed",
  candidate_proposed: "Candidate Proposed",
  promoted: "Promoted",
  dismissed: "Dismissed",
  noise: "Noise",
};

export interface MinedPattern {
  id: string;
  organization_id: string;
  pattern_type: MinedPatternType;
  title: string;
  description: string;
  pattern_signature: string;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  confidence_score: number;
  signal_strength: number;
  noise_score: number;
  success_rate: number | null;
  agent_types: string[];
  pipeline_stages: string[];
  domain_scopes: string[];
  involved_canon_ids: string[];
  involved_skill_ids: string[];
  status: MinedPatternStatus;
  proposed_candidate_id: string | null;
  dismissal_reason: string | null;
  evidence_refs: unknown;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export interface MiningEvidence {
  id: string;
  pattern_id: string;
  initiative_id: string | null;
  story_id: string | null;
  subtask_id: string | null;
  agent_type: string;
  pipeline_stage: string;
  outcome_status: string;
  outcome_quality: number;
  canon_entry_ids: string[];
  skill_ids: string[];
  action_sequence: unknown;
  context_snapshot: unknown;
  created_at: string;
}

export interface PatternRegistrationInput {
  patternType: MinedPatternType;
  title: string;
  description: string;
  patternSignature: string;
  agentTypes?: string[];
  pipelineStages?: string[];
  domainScopes?: string[];
  involvedCanonIds?: string[];
  involvedSkillIds?: string[];
  successRate?: number;
  evidenceRefs?: unknown[];
}

export interface EvidenceInput {
  patternId: string;
  initiativeId?: string;
  storyId?: string;
  subtaskId?: string;
  agentType?: string;
  pipelineStage?: string;
  outcomeStatus?: string;
  outcomeQuality?: number;
  canonEntryIds?: string[];
  skillIds?: string[];
  actionSequence?: unknown[];
  contextSnapshot?: Record<string, unknown>;
}

// ─── Noise & Confidence Scoring ───

const MIN_OCCURRENCES_FOR_CONFIRMATION = 3;
const MIN_CONFIDENCE_FOR_CANDIDATE = 0.6;
const NOISE_THRESHOLD = 0.65;
const MIN_SUCCESS_RATE_FOR_POSITIVE = 0.6;

function computePatternScoring(occurrences: number, successRate: number | null, evidenceQuality: number): {
  confidence: number;
  signalStrength: number;
  noiseScore: number;
  suggestedStatus: MinedPatternStatus;
} {
  // Confidence grows with occurrences (diminishing returns)
  const occurrenceFactor = Math.min(1, Math.log2(occurrences + 1) / 5);
  
  // Success rate factor (null = 0.5 assumed)
  const srFactor = successRate !== null ? successRate : 0.5;
  
  // Signal strength = evidence quality * occurrence factor
  const signalStrength = evidenceQuality * 0.5 + occurrenceFactor * 0.5;
  
  // Confidence = blend of all factors
  const confidence = occurrenceFactor * 0.35 + srFactor * 0.35 + evidenceQuality * 0.3;
  
  // Noise = inverse of signal
  const noiseScore = Math.max(0, 1 - signalStrength);
  
  // Status suggestion
  let suggestedStatus: MinedPatternStatus = "detected";
  if (noiseScore > NOISE_THRESHOLD) {
    suggestedStatus = "noise";
  } else if (occurrences >= MIN_OCCURRENCES_FOR_CONFIRMATION && confidence >= MIN_CONFIDENCE_FOR_CANDIDATE) {
    suggestedStatus = "confirmed";
  } else if (occurrences >= MIN_OCCURRENCES_FOR_CONFIRMATION) {
    suggestedStatus = "confirmed";
  }

  return { confidence, signalStrength, noiseScore, suggestedStatus };
}

// ─── Hook ───

export function useOperationalPatternMining() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["mined-patterns"] });
    qc.invalidateQueries({ queryKey: ["mining-evidence"] });
  };

  // ─── All mined patterns ───
  const patternsQuery = useQuery({
    queryKey: ["mined-patterns", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("operational_mined_patterns")
        .select("*")
        .eq("organization_id", orgId)
        .order("occurrence_count", { ascending: false });
      if (error) throw error;
      return (data || []) as MinedPattern[];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  // ─── Register or increment a pattern ───
  const registerPattern = useMutation({
    mutationFn: async (input: PatternRegistrationInput) => {
      if (!orgId) throw new Error("No organization");

      // Check if pattern with same signature exists
      const { data: existing } = await supabase
        .from("operational_mined_patterns")
        .select("id, occurrence_count, success_rate")
        .eq("organization_id", orgId)
        .eq("pattern_signature", input.patternSignature)
        .maybeSingle();

      if (existing) {
        // Increment occurrence
        const newCount = (existing.occurrence_count || 1) + 1;
        const blendedSR = input.successRate !== undefined
          ? ((existing.success_rate ?? 0.5) * existing.occurrence_count + input.successRate) / newCount
          : existing.success_rate;

        const scoring = computePatternScoring(newCount, blendedSR, 0.5);

        const { data, error } = await supabase
          .from("operational_mined_patterns")
          .update({
            occurrence_count: newCount,
            last_seen_at: new Date().toISOString(),
            success_rate: blendedSR,
            confidence_score: scoring.confidence,
            signal_strength: scoring.signalStrength,
            noise_score: scoring.noiseScore,
            status: scoring.suggestedStatus as any,
            agent_types: input.agentTypes || [],
            pipeline_stages: input.pipelineStages || [],
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return { pattern: data, isNew: false };
      }

      // New pattern
      const scoring = computePatternScoring(1, input.successRate ?? null, 0.3);

      const { data, error } = await supabase
        .from("operational_mined_patterns")
        .insert({
          organization_id: orgId,
          pattern_type: input.patternType as any,
          title: input.title,
          description: input.description,
          pattern_signature: input.patternSignature,
          occurrence_count: 1,
          confidence_score: scoring.confidence,
          signal_strength: scoring.signalStrength,
          noise_score: scoring.noiseScore,
          status: scoring.suggestedStatus as any,
          success_rate: input.successRate ?? null,
          agent_types: input.agentTypes || [],
          pipeline_stages: input.pipelineStages || [],
          domain_scopes: input.domainScopes || [],
          involved_canon_ids: input.involvedCanonIds || [],
          involved_skill_ids: input.involvedSkillIds || [],
          evidence_refs: (input.evidenceRefs || []) as any,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return { pattern: data, isNew: true };
    },
    onSuccess: (result) => {
      toast({
        title: result.isNew ? "Pattern detected" : "Pattern reinforced",
        description: `"${(result.pattern as any).title}" — ${(result.pattern as any).occurrence_count} occurrences`,
      });
      invalidate();
    },
    onError: (e: any) => {
      toast({ title: "Pattern registration failed", description: e.message, variant: "destructive" });
    },
  });

  // ─── Add evidence to a pattern ───
  const addEvidence = useMutation({
    mutationFn: async (input: EvidenceInput) => {
      if (!orgId) throw new Error("No organization");
      const { data, error } = await supabase
        .from("operational_mining_evidence")
        .insert({
          organization_id: orgId,
          pattern_id: input.patternId,
          initiative_id: input.initiativeId || null,
          story_id: input.storyId || null,
          subtask_id: input.subtaskId || null,
          agent_type: input.agentType || "unknown",
          pipeline_stage: input.pipelineStage || "unknown",
          outcome_status: input.outcomeStatus || "unknown",
          outcome_quality: input.outcomeQuality ?? 0.5,
          canon_entry_ids: input.canonEntryIds || [],
          skill_ids: input.skillIds || [],
          action_sequence: (input.actionSequence || []) as any,
          context_snapshot: (input.contextSnapshot || {}) as any,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(),
  });

  // ─── Propose pattern as canon candidate ───
  const proposeAsCandidate = useMutation({
    mutationFn: async (patternId: string) => {
      if (!orgId) throw new Error("No organization");

      // Get pattern
      const { data: pattern, error: pErr } = await supabase
        .from("operational_mined_patterns")
        .select("*")
        .eq("id", patternId)
        .single();
      if (pErr || !pattern) throw new Error("Pattern not found");

      const p = pattern as any;
      if (p.confidence_score < MIN_CONFIDENCE_FOR_CANDIDATE) {
        throw new Error(`Confidence ${p.confidence_score.toFixed(2)} below threshold ${MIN_CONFIDENCE_FOR_CANDIDATE}`);
      }
      if (p.noise_score > NOISE_THRESHOLD) {
        throw new Error(`Noise score ${p.noise_score.toFixed(2)} too high`);
      }

      // Create canon candidate
      const { data: candidate, error: cErr } = await supabase
        .from("canon_candidate_entries")
        .insert({
          organization_id: orgId,
          title: `[Mined] ${p.title}`,
          summary: p.description,
          body: JSON.stringify({
            pattern_type: p.pattern_type,
            occurrence_count: p.occurrence_count,
            success_rate: p.success_rate,
            agent_types: p.agent_types,
            pipeline_stages: p.pipeline_stages,
            evidence_refs: p.evidence_refs,
          }, null, 2),
          knowledge_type: "pattern",
          domain_scope: (p.domain_scopes || [])[0] || "general",
          source_type: "operational_mining",
          source_reference: `mined_pattern:${patternId}`,
          source_reliability_score: Math.round(p.confidence_score * 100),
          internal_validation_status: "pending",
          promotion_status: "pending",
          submitted_by: "pattern-mining-engine",
        } as any)
        .select()
        .single();
      if (cErr) throw cErr;

      // Update pattern status
      await supabase
        .from("operational_mined_patterns")
        .update({
          status: "candidate_proposed" as any,
          proposed_candidate_id: (candidate as any).id,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", patternId);

      return { pattern: p, candidate };
    },
    onSuccess: (result) => {
      toast({
        title: "Candidate proposed",
        description: `"${result.pattern.title}" submitted for canon review.`,
      });
      invalidate();
      qc.invalidateQueries({ queryKey: ["canon-candidates"] });
    },
    onError: (e: any) => {
      toast({ title: "Proposal failed", description: e.message, variant: "destructive" });
    },
  });

  // ─── Dismiss pattern ───
  const dismissPattern = useMutation({
    mutationFn: async ({ patternId, reason }: { patternId: string; reason: string }) => {
      const { error } = await supabase
        .from("operational_mined_patterns")
        .update({
          status: "dismissed" as any,
          dismissal_reason: reason,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", patternId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Pattern dismissed" });
      invalidate();
    },
  });

  // ─── Stats ───
  const patterns = patternsQuery.data || [];
  const stats = {
    total: patterns.length,
    byStatus: patterns.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {}),
    byType: patterns.reduce<Record<string, number>>((acc, p) => {
      acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1;
      return acc;
    }, {}),
    confirmed: patterns.filter((p) => p.status === "confirmed").length,
    proposable: patterns.filter(
      (p) => p.status === "confirmed" && p.confidence_score >= MIN_CONFIDENCE_FOR_CANDIDATE && p.noise_score <= NOISE_THRESHOLD
    ).length,
    avgConfidence: patterns.length
      ? patterns.reduce((s, p) => s + p.confidence_score, 0) / patterns.length
      : 0,
    noiseFiltered: patterns.filter((p) => p.status === "noise").length,
  };

  return {
    patterns,
    patternsLoading: patternsQuery.isLoading,
    registerPattern,
    addEvidence,
    proposeAsCandidate,
    dismissPattern,
    stats,
    invalidate,
  };
}
