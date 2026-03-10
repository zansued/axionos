import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useEvolutionProposals() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("evolution-proposal-governance", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const KEY = ["evolution-proposals", currentOrg?.id];

  const listQuery = useQuery({
    queryKey: KEY,
    queryFn: () => invoke("list_proposals"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const getProposal = (proposalId: string) =>
    invoke("get_proposal", { proposalId });

  const createProposal = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("create_proposal", params),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast({ title: "Proposta criada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const transitionStatus = useMutation({
    mutationFn: (params: { proposalId: string; target_status: string; notes?: string }) => invoke("transition_status", params),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast({ title: "Status atualizado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const evaluateLegitimacy = useMutation({
    mutationFn: (proposalId: string) => invoke("evaluate_legitimacy", { proposalId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const evaluateReadiness = useMutation({
    mutationFn: (proposalId: string) => invoke("evaluate_readiness", { proposalId }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const submitReview = useMutation({
    mutationFn: (params: { proposalId: string; review_status: string; review_notes?: string }) => invoke("submit_review", params),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast({ title: "Revisão registrada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const explainProposal = useMutation({
    mutationFn: (proposalId: string) => invoke("explain_proposal", { proposalId }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    proposals: listQuery.data?.proposals || [],
    loading: listQuery.isLoading,
    getProposal,
    createProposal,
    transitionStatus,
    evaluateLegitimacy,
    evaluateReadiness,
    submitReview,
    explainProposal,
  };
}
