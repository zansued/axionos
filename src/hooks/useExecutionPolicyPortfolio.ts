import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useExecutionPolicyPortfolio() {
  const { currentOrg } = useOrg();

  const { data: overview, isLoading, error, refetch } = useQuery({
    queryKey: ["execution-policy-portfolio-overview", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("execution-policy-portfolio-engine", {
        body: { action: "execution_policy_portfolio_overview", organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: rankings } = useQuery({
    queryKey: ["execution-policy-rankings", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("execution-policy-portfolio-engine", {
        body: { action: "execution_policy_rankings", organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  const { data: conflicts } = useQuery({
    queryKey: ["execution-policy-conflicts", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("execution-policy-portfolio-engine", {
        body: { action: "execution_policy_conflicts", organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  return { overview, rankings, conflicts, isLoading, error, refetch };
}
