import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useCanonEvolutionFromLearning() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("canon-evolution-from-learning", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const KEY = ["canon-evolution-from-learning", currentOrg?.id];
  const SUMMARY_KEY = ["canon-evolution-learning-summary", currentOrg?.id];

  const proposalsQuery = useQuery({
    queryKey: KEY,
    queryFn: () => invoke("list_proposals"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const summaryQuery = useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: () => invoke("get_summary"),
    enabled: !!currentOrg,
    refetchInterval: 60000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: SUMMARY_KEY });
  };

  const generateProposals = useMutation({
    mutationFn: () => invoke("generate_proposals"),
    onSuccess: (data) => {
      invalidateAll();
      toast({ title: `${data?.proposals_generated || 0} proposta(s) gerada(s)` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const getProposal = (proposalId: string) =>
    invoke("get_proposal", { proposalId });

  const transitionStatus = useMutation({
    mutationFn: (params: { proposalId: string; target_status: string; notes?: string }) =>
      invoke("transition_status", params),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Status atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    proposals: proposalsQuery.data?.proposals || [],
    summary: summaryQuery.data?.summary || null,
    loading: proposalsQuery.isLoading,
    loadingSummary: summaryQuery.isLoading,
    generateProposals,
    getProposal,
    transitionStatus,
  };
}
