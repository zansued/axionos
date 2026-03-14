import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook for canon candidate review operations.
 * Uses canon-review-engine which operates on canon_candidate_entries table.
 */
export function useCanonCandidateReview() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("canon-review-engine", {
      body: { action, organization_id: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const STATUS_KEY = ["canon-candidate-review-status", currentOrg?.id];

  const statusQuery = useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => invoke("get_pipeline_status"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: STATUS_KEY });
    qc.invalidateQueries({ queryKey: ["canon-intelligence"] });
    qc.invalidateQueries({ queryKey: ["canon-pipeline-stats"] });
    qc.invalidateQueries({ queryKey: ["canon-candidates"] });
  };

  const reviewPending = useMutation({
    mutationFn: (batchSize?: number) => invoke("review_candidates"),
    onSuccess: (data) => {
      invalidate();
      toast({ title: `${data?.reviewed || 0} candidato(s) avaliado(s): ${data?.approved || 0} aprovados, ${data?.rejected || 0} rejeitados` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const promoteReady = useMutation({
    mutationFn: () => invoke("promote_approved"),
    onSuccess: (data) => {
      invalidate();
      toast({ title: `${data?.promoted || 0} candidato(s) promovido(s)` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const runFullCycle = useMutation({
    mutationFn: () => invoke("run_full_pipeline"),
    onSuccess: (data) => {
      invalidate();
      const promo = data?.promotion?.promoted || 0;
      toast({ title: `Ciclo completo — ${promo} promovido(s)` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    status: statusQuery.data,
    loadingStatus: statusQuery.isLoading,
    reviewPending,
    promoteReady,
    runFullCycle,
  };
}
