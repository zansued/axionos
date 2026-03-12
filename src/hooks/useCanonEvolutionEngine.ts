import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useCanonEvolutionEngine() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("canon-evolution-engine", {
      body: { action, organization_id: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const STATUS_KEY = ["canon-evolution-engine-status", currentOrg?.id];

  const statusQuery = useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => invoke("get_pipeline_status"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: STATUS_KEY });
    qc.invalidateQueries({ queryKey: ["canon-intelligence"] });
  };

  const evaluateCandidates = useMutation({
    mutationFn: (batchSize?: number) => invoke("evaluate_candidates", { batch_size: batchSize }),
    onSuccess: (data) => {
      invalidate();
      toast({ title: `${data?.evaluated || 0} candidato(s) avaliado(s)` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deduplicateCandidates = useMutation({
    mutationFn: () => invoke("deduplicate_candidates"),
    onSuccess: (data) => {
      invalidate();
      toast({ title: `${data?.merged || 0} duplicata(s) detectada(s)` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const promoteCandidates = useMutation({
    mutationFn: () => invoke("promote_candidates"),
    onSuccess: (data) => {
      invalidate();
      toast({ title: `${data?.promoted || 0} entrada(s) promovida(s) ao Canon` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const runFullPipeline = useMutation({
    mutationFn: () => invoke("run_full_pipeline"),
    onSuccess: (data) => {
      invalidate();
      const promo = data?.promotion?.promoted || 0;
      toast({ title: `Pipeline completo — ${promo} entrada(s) promovida(s)` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const processBacklog = useMutation({
    mutationFn: () => invoke("process_backlog"),
    onSuccess: (data) => {
      invalidate();
      toast({ title: `Backlog processado — ${data?.total_evaluated || 0} avaliados, ${data?.promotion?.promoted || 0} promovidos` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const reinforceFromSignals = useMutation({
    mutationFn: () => invoke("reinforce_from_signals"),
    onSuccess: (data) => {
      invalidate();
      toast({ title: `${data?.reinforced || 0} entrada(s) reforçada(s)` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    status: statusQuery.data,
    loadingStatus: statusQuery.isLoading,
    evaluateCandidates,
    deduplicateCandidates,
    promoteCandidates,
    runFullPipeline,
    processBacklog,
    reinforceFromSignals,
  };
}
