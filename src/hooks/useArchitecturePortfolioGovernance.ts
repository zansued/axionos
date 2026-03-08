import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function invoke(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("architecture-portfolio-governance", {
    body: { action, organization_id: orgId, ...params },
  });
}

export function useArchitecturePortfolioGovernance() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const keys = ["arch-portfolio-overview", "arch-portfolio-list", "arch-portfolio-members", "arch-portfolio-recs"];

  const overview = useQuery({
    queryKey: ["arch-portfolio-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "overview"); if (error) throw error; return data; },
    refetchInterval: 30000,
  });

  const portfolios = useQuery({
    queryKey: ["arch-portfolio-list", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "portfolios"); if (error) throw error; return data; },
  });

  const recommendations = useQuery({
    queryKey: ["arch-portfolio-recs", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "recommendations"); if (error) throw error; return data; },
  });

  const invalidateAll = () => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  const recompute = useMutation({
    mutationFn: async () => { const { data, error } = await invoke(orgId!, "recompute"); if (error) throw error; return data; },
    onSuccess: () => { toast.success("Portfolio recomputed"); invalidateAll(); },
    onError: () => toast.error("Failed to recompute"),
  });

  const reviewRecommendation = useMutation({
    mutationFn: async (p: { recommendation_id: string; status: string }) => {
      const { data, error } = await invoke(orgId!, "review_recommendation", p);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Recommendation updated"); invalidateAll(); },
    onError: () => toast.error("Failed to update recommendation"),
  });

  const archivePortfolio = useMutation({
    mutationFn: async (portfolio_id: string) => {
      const { data, error } = await invoke(orgId!, "archive_portfolio", { portfolio_id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Portfolio archived"); invalidateAll(); },
    onError: () => toast.error("Failed to archive"),
  });

  return { overview, portfolios, recommendations, recompute, reviewRecommendation, archivePortfolio };
}
