import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function invoke(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("product-opportunity-portfolio-governance-engine", {
    body: { action, organization_id: orgId, ...params },
  });
}

export function useProductOpportunityPortfolio() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const keys = ["prod-opp-overview", "prod-opp-portfolios", "prod-opp-items", "prod-opp-conflicts", "prod-opp-decisions", "prod-opp-outcomes"];

  const overview = useQuery({
    queryKey: ["prod-opp-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "overview"); if (error) throw error; return data; },
    refetchInterval: 30000,
  });

  const portfolios = useQuery({
    queryKey: ["prod-opp-portfolios", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "portfolios"); if (error) throw error; return data; },
  });

  const rankedItems = useQuery({
    queryKey: ["prod-opp-items", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "rank_opportunities"); if (error) throw error; return data; },
  });

  const conflicts = useQuery({
    queryKey: ["prod-opp-conflicts", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "detect_conflicts"); if (error) throw error; return data; },
  });

  const decisions = useQuery({
    queryKey: ["prod-opp-decisions", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "recommend_decisions"); if (error) throw error; return data; },
  });

  const outcomes = useQuery({
    queryKey: ["prod-opp-outcomes", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "portfolio_outcomes"); if (error) throw error; return data; },
  });

  const invalidateAll = () => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  const reviewDecision = useMutation({
    mutationFn: async (p: { decision_id: string; status: string }) => {
      const { data, error } = await invoke(orgId!, "review_decision", p);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Decision updated"); invalidateAll(); },
    onError: () => toast.error("Failed to update decision"),
  });

  return { overview, portfolios, rankedItems, conflicts, decisions, outcomes, reviewDecision };
}
