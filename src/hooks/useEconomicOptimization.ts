import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchEconAction(action: string, organizationId: string, payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("economic-optimization-engine", {
    body: { action, organization_id: organizationId, payload },
  });
  if (error) throw error;
  return data;
}

export function useEconomicOptimization(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  const overview = useQuery({
    queryKey: ["economic-optimization", "overview", organizationId],
    queryFn: () => fetchEconAction("overview", organizationId!),
    enabled: !!organizationId,
    refetchInterval: 30000,
  });

  const health = useQuery({
    queryKey: ["economic-optimization", "health", organizationId],
    queryFn: () => fetchEconAction("health", organizationId!),
    enabled: !!organizationId,
    refetchInterval: 30000,
  });

  const migrationRoi = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchEconAction("migration_roi", organizationId!, payload),
  });

  const rolloutEconomics = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchEconAction("rollout_economics", organizationId!, payload),
  });

  const tenantModeEconomics = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchEconAction("tenant_mode_economics", organizationId!, payload),
  });

  const assessChange = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchEconAction("assess_change", organizationId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["economic-optimization"] });
    },
  });

  const explainAssessment = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchEconAction("explain", organizationId!, payload),
  });

  return {
    overview,
    health,
    migrationRoi,
    rolloutEconomics,
    tenantModeEconomics,
    assessChange,
    explainAssessment,
  };
}
