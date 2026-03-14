import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useCanonReviewPipeline() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("canon-review-engine", {
      body: { action, organization_id: orgId, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const STATUS_KEY = ["canon-review-pipeline-status", orgId];

  const statusQuery = useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => invoke("get_pipeline_status"),
    enabled: !!orgId,
    refetchInterval: 15000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: STATUS_KEY });
    qc.invalidateQueries({ queryKey: ["canon-evolution-candidates", orgId] });
    qc.invalidateQueries({ queryKey: ["canon-evolution-proposals", orgId] });
  };

  const reviewCandidates = useMutation({
    mutationFn: () => invoke("review_candidates"),
    onSuccess: (data: any) => {
      invalidateAll();
      toast({ title: "Revisão concluída", description: `${data?.approved || 0} aprovados, ${data?.rejected || 0} rejeitados` });
    },
    onError: (e: any) => toast({ title: "Erro na revisão", description: e.message, variant: "destructive" }),
  });

  const promoteApproved = useMutation({
    mutationFn: () => invoke("promote_approved"),
    onSuccess: (data: any) => {
      invalidateAll();
      toast({ title: "Promoção concluída", description: `${data?.promoted || 0} entradas promovidas ao Canon` });
    },
    onError: (e: any) => toast({ title: "Erro na promoção", description: e.message, variant: "destructive" }),
  });

  const runFullPipeline = useMutation({
    mutationFn: () => invoke("run_full_pipeline"),
    onSuccess: (data: any) => {
      invalidateAll();
      const rev = data?.review || {};
      const pro = data?.promotion || {};
      toast({
        title: "Pipeline completo",
        description: `Revisados: ${rev.reviewed || 0} | Aprovados: ${rev.approved || 0} | Promovidos: ${pro.promoted || 0}`,
      });
    },
    onError: (e: any) => toast({ title: "Erro no pipeline", description: e.message, variant: "destructive" }),
  });

  const status = statusQuery.data as any;

  return {
    status,
    statusLoading: statusQuery.isLoading,
    reviewCandidates,
    promoteApproved,
    runFullPipeline,
    isRunning: reviewCandidates.isPending || promoteApproved.isPending || runFullPipeline.isPending,
  };
}
