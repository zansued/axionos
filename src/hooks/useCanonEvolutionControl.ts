import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useCanonEvolutionControl() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("canon-evolution-control", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const CANDIDATES_KEY = ["canon-evolution-candidates", currentOrg?.id];
  const PROPOSALS_KEY = ["canon-evolution-proposals", currentOrg?.id];

  const candidatesQuery = useQuery({
    queryKey: CANDIDATES_KEY,
    queryFn: () => invoke("list_candidates"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const proposalsQuery = useQuery({
    queryKey: PROPOSALS_KEY,
    queryFn: () => invoke("list_proposals"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: CANDIDATES_KEY });
    qc.invalidateQueries({ queryKey: PROPOSALS_KEY });
  };

  const registerCandidate = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("register_external_candidate", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Candidato registrado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const submitReview = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("submit_review", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Revisão registrada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const detectConflict = useMutation({
    mutationFn: (candidateId: string) => invoke("detect_canon_conflict", { candidateId }),
    onSuccess: () => invalidateAll(),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const openProposal = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("open_evolution_proposal", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Proposta criada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const transitionProposal = useMutation({
    mutationFn: (params: { proposalId: string; target_status: string; notes?: string }) => invoke("transition_proposal", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Status atualizado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const promoteCandidate = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("promote_candidate", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Decisão de promoção registrada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const rejectCandidate = useMutation({
    mutationFn: (params: { candidateId: string; reason?: string; actor?: string }) => invoke("reject_candidate", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Candidato rejeitado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const explainChange = useMutation({
    mutationFn: (candidateId?: string) => invoke("explain_canon_change", { candidateId }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    candidates: candidatesQuery.data?.candidates || [],
    proposals: proposalsQuery.data?.proposals || [],
    loadingCandidates: candidatesQuery.isLoading,
    loadingProposals: proposalsQuery.isLoading,
    registerCandidate,
    submitReview,
    detectConflict,
    openProposal,
    transitionProposal,
    promoteCandidate,
    rejectCandidate,
    explainChange,
  };
}
