import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchConvergenceAction(action: string, organizationId: string, payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("platform-convergence-engine", {
    body: { action, organization_id: organizationId, payload },
  });
  if (error) throw error;
  return data;
}

export function usePlatformConvergence(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  const overview = useQuery({
    queryKey: ["platform-convergence", "overview", organizationId],
    queryFn: () => fetchConvergenceAction("overview", organizationId!),
    enabled: !!organizationId,
    refetchInterval: 30000,
  });

  const recommendations = useQuery({
    queryKey: ["platform-convergence", "recommendations", organizationId],
    queryFn: () => fetchConvergenceAction("recommendations", organizationId!),
    enabled: !!organizationId,
  });

  const outcomes = useQuery({
    queryKey: ["platform-convergence", "outcomes", organizationId],
    queryFn: () => fetchConvergenceAction("outcomes", organizationId!),
    enabled: !!organizationId,
  });

  const analyzeScope = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchConvergenceAction("analyze_scope", organizationId!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-convergence"] }),
  });

  const detectCandidates = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchConvergenceAction("detect_candidates", organizationId!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-convergence"] }),
  });

  const comparePaths = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchConvergenceAction("compare_paths", organizationId!, payload),
  });

  const explainScore = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchConvergenceAction("explain", organizationId!, payload),
  });

  return { overview, recommendations, outcomes, analyzeScope, detectCandidates, comparePaths, explainScore };
}
