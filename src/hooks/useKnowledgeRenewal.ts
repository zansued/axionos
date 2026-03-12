import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useKnowledgeRenewal() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("knowledge-renewal-engine", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const KEYS = {
    triggers: ["renewal-triggers", currentOrg?.id],
    workflows: ["renewal-workflows", currentOrg?.id],
    proposals: ["renewal-proposals", currentOrg?.id],
    history: ["renewal-history", currentOrg?.id],
    bridges: ["renewal-bridges", currentOrg?.id],
  };

  const invalidateAll = () => {
    Object.values(KEYS).forEach((k) => qc.invalidateQueries({ queryKey: k }));
  };

  const triggersQuery = useQuery({
    queryKey: KEYS.triggers,
    queryFn: () => invoke("list_triggers"),
    enabled: !!currentOrg,
  });

  const workflowsQuery = useQuery({
    queryKey: KEYS.workflows,
    queryFn: () => invoke("list_workflows"),
    enabled: !!currentOrg,
  });

  const proposalsQuery = useQuery({
    queryKey: KEYS.proposals,
    queryFn: () => invoke("list_proposals"),
    enabled: !!currentOrg,
  });

  const historyQuery = useQuery({
    queryKey: KEYS.history,
    queryFn: () => invoke("list_history"),
    enabled: !!currentOrg,
  });

  const bridgesQuery = useQuery({
    queryKey: KEYS.bridges,
    queryFn: () => invoke("list_bridges"),
    enabled: !!currentOrg,
  });

  const scanTriggers = useMutation({
    mutationFn: () => invoke("scan_triggers"),
    onSuccess: (d) => {
      invalidateAll();
      toast({ title: "Scan concluído", description: `${d.triggers?.length || 0} gatilhos detectados em ${d.scanned || 0} entradas.` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const startRevalidation = useMutation({
    mutationFn: (params: { triggerId: string; mode?: string }) => invoke("start_revalidation", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Revalidação iniciada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const completeWorkflow = useMutation({
    mutationFn: (params: {
      workflowId: string;
      confidenceAfter?: number;
      evidenceSummary?: Record<string, any>;
      hasStrongerCompetitor?: boolean;
      evidenceStrength?: number;
    }) => invoke("complete_workflow", params),
    onSuccess: (d) => { invalidateAll(); toast({ title: `Revalidação concluída: ${d.outcome}` }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const generateProposal = useMutation({
    mutationFn: (params: { triggerId: string; workflowOutcome?: string; workflowId?: string }) =>
      invoke("generate_proposal", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Proposta gerada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const decideProposal = useMutation({
    mutationFn: (params: { proposalId: string; decision: string; notes?: string }) =>
      invoke("decide_proposal", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Decisão registrada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Sprint 185: Bridge mutations
  const createBridge = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("create_bridge", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Bridge de governança criado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const decideBridge = useMutation({
    mutationFn: (params: { bridgeId: string; decision: string; notes?: string }) =>
      invoke("decide_bridge", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Decisão de bridge registrada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const backPropagate = useMutation({
    mutationFn: (params: { bridgeId: string }) => invoke("back_propagate", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Decisão propagada ao conhecimento" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    triggers: triggersQuery.data?.triggers || [],
    workflows: workflowsQuery.data?.workflows || [],
    proposals: proposalsQuery.data?.proposals || [],
    history: historyQuery.data?.history || [],
    bridges: bridgesQuery.data?.bridges || [],
    loading: triggersQuery.isLoading,
    scanTriggers,
    startRevalidation,
    completeWorkflow,
    generateProposal,
    decideProposal,
    createBridge,
    decideBridge,
    backPropagate,
  };
}
