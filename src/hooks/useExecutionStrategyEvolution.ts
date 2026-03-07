import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useExecutionStrategyEvolution() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("execution-strategy-evolution", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const overviewQuery = useQuery({
    queryKey: ["strategy-evolution-overview", currentOrg?.id],
    queryFn: () => invoke("overview"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const reviewVariant = useMutation({
    mutationFn: (params: { variantId: string; decision: "approve" | "reject" }) => invoke("review_variant", params),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategy-evolution-overview"] }); toast({ title: "Variante atualizada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const startExperiment = useMutation({
    mutationFn: (variantId: string) => invoke("start_experiment", { variantId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategy-evolution-overview"] }); toast({ title: "Experimento iniciado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const stopExperiment = useMutation({
    mutationFn: (experimentId: string) => invoke("stop_experiment", { experimentId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategy-evolution-overview"] }); toast({ title: "Experimento encerrado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const rollbackVariant = useMutation({
    mutationFn: (variantId: string) => invoke("rollback_variant", { variantId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategy-evolution-overview"] }); toast({ title: "Variante revertida" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const recompute = useMutation({
    mutationFn: () => invoke("recompute"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategy-evolution-overview"] }); toast({ title: "Recalculado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    overview: overviewQuery.data,
    loading: overviewQuery.isLoading,
    reviewVariant,
    startExperiment,
    stopExperiment,
    rollbackVariant,
    recompute,
  };
}
