import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useStrategyPortfolioGovernance() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("strategy-portfolio-governance", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const overviewQuery = useQuery({
    queryKey: ["strategy-portfolio-overview", currentOrg?.id],
    queryFn: () => invoke("overview"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const computeMetrics = useMutation({
    mutationFn: (portfolioId: string) => invoke("metrics", { portfolioId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategy-portfolio-overview"] }); toast({ title: "Métricas computadas" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const getRecommendations = useMutation({
    mutationFn: (portfolioId: string) => invoke("recommendations", { portfolioId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategy-portfolio-overview"] }); toast({ title: "Recomendações geradas" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateLifecycle = useMutation({
    mutationFn: (params: { memberId: string; targetStatus: string; reason: string }) => invoke("lifecycle_update", params),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategy-portfolio-overview"] }); toast({ title: "Lifecycle atualizado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const explain = useMutation({
    mutationFn: (portfolioId: string) => invoke("explain", { portfolioId }),
  });

  return {
    overview: overviewQuery.data,
    loading: overviewQuery.isLoading,
    computeMetrics,
    getRecommendations,
    updateLifecycle,
    explain,
  };
}
