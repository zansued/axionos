import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useSovereignCapabilities() {
  const { currentOrg } = useOrg();

  const invoke = async (action: string) => {
    const { data, error } = await supabase.functions.invoke("sovereign-capabilities-engine", {
      body: { action, organizationId: currentOrg?.id },
    });
    if (error) throw error;
    return data;
  };

  const overviewQuery = useQuery({
    queryKey: ["sovereign-capabilities-overview", currentOrg?.id],
    queryFn: () => invoke("portfolio_overview"),
    enabled: !!currentOrg,
    refetchInterval: 60000,
  });

  const gapQuery = useQuery({
    queryKey: ["sovereign-capabilities-gaps", currentOrg?.id],
    queryFn: () => invoke("gap_analysis"),
    enabled: !!currentOrg,
  });

  return {
    overview: overviewQuery.data,
    gaps: gapQuery.data,
    loading: overviewQuery.isLoading,
    gapsLoading: gapQuery.isLoading,
    refetch: () => {
      overviewQuery.refetch();
      gapQuery.refetch();
    },
  };
}
