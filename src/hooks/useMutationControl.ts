import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useMutationControl() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("architectural-mutation-control", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const KEY = ["mutation-control", currentOrg?.id];

  const listQuery = useQuery({
    queryKey: KEY,
    queryFn: () => invoke("list_cases"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const getCase = (caseId: string) => invoke("get_case", { caseId });

  const createCase = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("create_mutation_case", params),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast({ title: "Caso de mutação criado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const analyzeBlastRadius = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("analyze_blast_radius", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const analyzeCoupling = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("analyze_coupling", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const evaluateReversibility = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("evaluate_reversibility", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const scoreLegitimacy = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("score_legitimacy", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const transitionStatus = useMutation({
    mutationFn: (params: { caseId: string; target_status: string; notes?: string }) => invoke("transition_status", params),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast({ title: "Status atualizado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const explainCase = useMutation({
    mutationFn: (caseId: string) => invoke("explain_case", { caseId }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    cases: listQuery.data?.cases || [],
    loading: listQuery.isLoading,
    getCase,
    createCase,
    analyzeBlastRadius,
    analyzeCoupling,
    evaluateReversibility,
    scoreLegitimacy,
    transitionStatus,
    explainCase,
  };
}
