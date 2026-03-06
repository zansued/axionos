import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export interface ErrorPatternData {
  id: string;
  error_category: string;
  normalized_signature: string;
  title: string;
  frequency: number;
  success_rate: number;
  severity: string;
  repairability: string;
  affected_stages: string[];
  successful_strategies: string[];
  failed_strategies: string[];
  last_seen_at: string;
}

export interface StrategyEffectivenessData {
  id: string;
  error_category: string;
  repair_strategy: string;
  attempts_total: number;
  successes_total: number;
  success_rate: number;
  average_duration_ms: number;
  confidence_score: number;
}

export interface PreventionCandidateData {
  id: string;
  rule_type: string;
  description: string;
  proposed_action: string;
  expected_impact: string;
  confidence_score: number;
  error_patterns?: { title: string; error_category: string; frequency: number } | null;
}

export function useErrorPatterns() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const patternsQuery = useQuery<ErrorPatternData[]>({
    queryKey: ["error-patterns", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "error-pattern-library-engine",
        { body: { action: "get_patterns", organization_id: orgId } },
      );
      if (error) throw error;
      return (data?.patterns || []) as ErrorPatternData[];
    },
    staleTime: 60_000,
  });

  const effectivenessQuery = useQuery<StrategyEffectivenessData[]>({
    queryKey: ["strategy-effectiveness", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "error-pattern-library-engine",
        { body: { action: "get_effectiveness", organization_id: orgId } },
      );
      if (error) throw error;
      return (data?.effectiveness || []) as StrategyEffectivenessData[];
    },
    staleTime: 60_000,
  });

  const candidatesQuery = useQuery<PreventionCandidateData[]>({
    queryKey: ["prevention-candidates", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "error-pattern-library-engine",
        { body: { action: "get_candidates", organization_id: orgId } },
      );
      if (error) throw error;
      return (data?.candidates || []) as PreventionCandidateData[];
    },
    staleTime: 60_000,
  });

  return {
    patterns: patternsQuery.data || [],
    effectiveness: effectivenessQuery.data || [],
    candidates: candidatesQuery.data || [],
    isLoading: patternsQuery.isLoading || effectivenessQuery.isLoading,
    error: patternsQuery.error || effectivenessQuery.error,
  };
}
