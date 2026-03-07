import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useExecutionPolicyDashboard() {
  const { currentOrg } = useOrg();

  const { data: overview, isLoading, error } = useQuery({
    queryKey: ["execution-policy-overview", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("execution-policy-engine", {
        body: { action: "execution_policy_overview", organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: decisions } = useQuery({
    queryKey: ["execution-policy-decisions", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("execution-policy-engine", {
        body: { action: "execution_policy_decisions", organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  return { overview, decisions, isLoading, error };
}
