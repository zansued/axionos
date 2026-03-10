import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

interface CandidateSummary {
  total_candidates: number;
  high_confidence_count: number;
  by_type: Record<string, number>;
  by_scope: Record<string, number>;
  by_status: Record<string, number>;
  top_signal_domains: { domain: string; count: number }[];
}

interface LearningCandidate {
  id: string;
  candidate_type: string;
  candidate_scope: string;
  pattern_signature: string;
  evidence_count: number;
  confidence_score: number;
  first_observed_at: string;
  last_observed_at: string;
  source_domains: string[];
  recommended_action: string;
  status: string;
  created_at: string;
}

export function useLearningExtraction() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const [extractionResult, setExtractionResult] = useState<any>(null);

  const orgId = currentOrg?.id;

  const candidatesQuery = useQuery({
    queryKey: ["learning-candidates", orgId],
    queryFn: async (): Promise<LearningCandidate[]> => {
      if (!orgId) return [];
      const { data } = await supabase.functions.invoke("learning-extraction-engine", {
        body: { organization_id: orgId, action: "list_candidates" },
      });
      return data?.candidates || [];
    },
    enabled: !!orgId,
  });

  const summaryQuery = useQuery({
    queryKey: ["learning-candidate-summary", orgId],
    queryFn: async (): Promise<CandidateSummary | null> => {
      if (!orgId) return null;
      const { data } = await supabase.functions.invoke("learning-extraction-engine", {
        body: { organization_id: orgId, action: "candidate_summary" },
      });
      return data || null;
    },
    enabled: !!orgId,
  });

  const extractMutation = useMutation({
    mutationFn: async (lookbackDays: number = 30) => {
      if (!orgId) throw new Error("No org");
      const { data, error } = await supabase.functions.invoke("learning-extraction-engine", {
        body: { organization_id: orgId, action: "extract_candidates", lookback_days: lookbackDays },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setExtractionResult(data);
      queryClient.invalidateQueries({ queryKey: ["learning-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["learning-candidate-summary"] });
    },
  });

  return {
    candidates: candidatesQuery.data || [],
    candidatesLoading: candidatesQuery.isLoading,
    summary: summaryQuery.data,
    summaryLoading: summaryQuery.isLoading,
    extract: extractMutation.mutate,
    extracting: extractMutation.isPending,
    extractionResult,
  };
}
