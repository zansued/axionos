import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchGovAction(action: string, organizationId: string, payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("convergence-governance-engine", {
    body: { action, organization_id: organizationId, payload },
  });
  if (error) throw error;
  return data;
}

export function useConvergenceGovernance(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  const overview = useQuery({
    queryKey: ["convergence-governance", "overview", organizationId],
    queryFn: () => fetchGovAction("overview", organizationId!),
    enabled: !!organizationId,
    refetchInterval: 30000,
  });

  const reviewQueue = useQuery({
    queryKey: ["convergence-governance", "review-queue", organizationId],
    queryFn: () => fetchGovAction("review_queue", organizationId!),
    enabled: !!organizationId,
  });

  const outcomes = useQuery({
    queryKey: ["convergence-governance", "outcomes", organizationId],
    queryFn: () => fetchGovAction("outcomes", organizationId!),
    enabled: !!organizationId,
  });

  const buildCases = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchGovAction("build_cases", organizationId!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["convergence-governance"] }),
  });

  const assessPromotion = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchGovAction("assess_promotion", organizationId!, payload),
  });

  const assessRetirement = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchGovAction("assess_retirement", organizationId!, payload),
  });

  const compareActions = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchGovAction("compare_actions", organizationId!, payload),
  });

  const explainCase = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchGovAction("explain", organizationId!, payload),
  });

  return { overview, reviewQueue, outcomes, buildCases, assessPromotion, assessRetirement, compareActions, explainCase };
}
