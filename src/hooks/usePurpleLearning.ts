import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("purple-learning", { body: { action, ...params } });
  if (error) throw error;
  return data;
}

export function usePurpleLearningOverview() {
  return useQuery({ queryKey: ["purple-learning", "overview"], queryFn: () => invoke("overview") });
}
export function usePurpleCandidates() {
  return useQuery({ queryKey: ["purple-learning", "candidates"], queryFn: () => invoke("list_candidates") });
}
export function usePurplePatterns() {
  return useQuery({ queryKey: ["purple-learning", "patterns"], queryFn: () => invoke("list_patterns") });
}
export function usePurpleAntiPatterns() {
  return useQuery({ queryKey: ["purple-learning", "anti_patterns"], queryFn: () => invoke("list_anti_patterns") });
}
export function usePurpleChecklists() {
  return useQuery({ queryKey: ["purple-learning", "checklists"], queryFn: () => invoke("list_checklists") });
}
export function usePurpleRules() {
  return useQuery({ queryKey: ["purple-learning", "rules"], queryFn: () => invoke("list_rules") });
}
export function usePurpleReviews() {
  return useQuery({ queryKey: ["purple-learning", "reviews"], queryFn: () => invoke("list_reviews") });
}
export function useSynthesizeLearning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invoke("synthesize", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purple-learning"] }),
  });
}
