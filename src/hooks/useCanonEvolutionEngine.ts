import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

/**
 * useCanonEvolutionEngine — Sprint 202
 *
 * Post-canon maintenance hook. Does NOT review or promote raw candidates.
 * Candidate review authority belongs exclusively to canon-review-engine.
 *
 * Available operations:
 *   - runFullPipeline: orchestrates review (via review-engine) + dedup + reinforce
 *   - processBacklog: multi-round orchestration
 *   - deduplicateCandidates: merge duplicate candidates
 *   - reinforceFromSignals: boost canon entry confidence from operational signals
 */
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
    qc.invalidateQueries({ queryKey: ["canon-library"] });
    qc.invalidateQueries({ queryKey: ["canon-candidates"] });
    qc.invalidateQueries({ queryKey: ["canon-pipeline-stats"] });
  };

  const deduplicateCandidates = useMutation({
    mutationFn: () => invoke("deduplicate_candidates"),
    onSuccess: (data) => {
      invalidate();
      toast({ title: `${data?.merged || 0} duplicata(s) detectada(s)` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const runFullPipeline = useMutation({
    mutationFn: () => invoke("run_full_pipeline"),
    onSuccess: (data) => {
      invalidate();
      const reviewed = data?.review?.reviewed || 0;
      const promo = data?.promotion?.promoted || 0;
      toast({ title: `Pipeline completo — ${reviewed} revisados, ${promo} promovidos` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const processBacklog = useMutation({
    mutationFn: () => invoke("process_backlog"),
    onSuccess: (data) => {
      invalidate();
      toast({ title: `Backlog processado — ${data?.total_reviewed || 0} revisados, ${data?.promotion?.promoted || 0} promovidos` });
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
    deduplicateCandidates,
    runFullPipeline,
    processBacklog,
    reinforceFromSignals,
  };
}
