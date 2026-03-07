import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useTenantPolicyDashboard() {
  const { currentOrg } = useOrg();

  const { data: overview, isLoading, error, refetch } = useQuery({
    queryKey: ["tenant-policy-overview", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tenant-policy-engine", {
        body: { action: "tenant_policy_overview", organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: recommendations } = useQuery({
    queryKey: ["tenant-policy-recommendations", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tenant-policy-engine", {
        body: { action: "tenant_policy_recommendations", organization_id: currentOrg!.id, status: "open" },
      });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  return { overview, recommendations, isLoading, error, refetch };
}
