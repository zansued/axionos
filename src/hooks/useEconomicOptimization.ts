import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchEconAction(action: string, organizationId: string, payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("economic-optimization-engine", {
    body: { action, organization_id: organizationId, payload },
  });
  if (error) throw error;
  return data;
}

export function useEconomicOptimization(organizationId: string | undefined) {
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

  return { overview, health };
}
