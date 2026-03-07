import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LearningOverview {
  learning_records_count: number;
  recommendations_count: number;
  repair_improvement_rate: number;
  prompt_success_trend: number;
  error_prediction_accuracy: number;
  recent_weight_adjustments: any[];
  top_predictions: any[];
  top_prompt_metrics: any[];
}

export interface LearningRecommendation {
  id: string;
  recommendation_type: string;
  target_component: string;
  description: string;
  confidence_score: number;
  supporting_evidence: any[];
  metrics_summary: Record<string, any>;
  expected_improvement: string | null;
  status: string;
  created_at: string;
}

async function fetchLearningData(orgId: string, view: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke("learning-dashboard", {
    body: { organization_id: orgId, view },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  return data;
}

export function useLearningOverview(orgId: string | undefined) {
  return useQuery<LearningOverview>({
    queryKey: ["learning-overview", orgId],
    enabled: !!orgId,
    queryFn: () => fetchLearningData(orgId!, "overview"),
    staleTime: 30_000,
  });
}

export function useLearningRecommendations(orgId: string | undefined) {
  return useQuery<{ recommendations: LearningRecommendation[] }>({
    queryKey: ["learning-recommendations", orgId],
    enabled: !!orgId,
    queryFn: () => fetchLearningData(orgId!, "recommendations"),
    staleTime: 30_000,
  });
}

export function useLearningStrategies(orgId: string | undefined) {
  return useQuery<{ strategies: any[] }>({
    queryKey: ["learning-strategies", orgId],
    enabled: !!orgId,
    queryFn: () => fetchLearningData(orgId!, "strategies"),
    staleTime: 30_000,
  });
}

export function useLearningPredictions(orgId: string | undefined) {
  return useQuery<{ predictions: any[] }>({
    queryKey: ["learning-predictions", orgId],
    enabled: !!orgId,
    queryFn: () => fetchLearningData(orgId!, "errors"),
    staleTime: 30_000,
  });
}
