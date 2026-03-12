import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useKnowledgeDemandForecast() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("knowledge-demand-forecast", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const KEYS = {
    forecasts: ["demand-forecasts", currentOrg?.id],
    signals: ["forecast-signals", currentOrg?.id],
    proposals: ["demand-proposals", currentOrg?.id],
  };

  const invalidateAll = () => Object.values(KEYS).forEach((k) => qc.invalidateQueries({ queryKey: k }));

  const forecastsQuery = useQuery({ queryKey: KEYS.forecasts, queryFn: () => invoke("list_forecasts"), enabled: !!currentOrg });
  const signalsQuery = useQuery({ queryKey: KEYS.signals, queryFn: () => invoke("list_signals"), enabled: !!currentOrg });
  const proposalsQuery = useQuery({ queryKey: KEYS.proposals, queryFn: () => invoke("list_proposals"), enabled: !!currentOrg });

  const generateForecasts = useMutation({
    mutationFn: () => invoke("generate_forecasts"),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Forecasts gerados", description: `${d.forecasts_created} previsões, ${d.rising_domains} domínios em alta` }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const generateProposals = useMutation({
    mutationFn: () => invoke("generate_demand_proposals"),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Propostas geradas", description: `${d.proposals_created} propostas` }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const decideProposal = useMutation({
    mutationFn: (params: { proposalId: string; decision: string; notes?: string }) => invoke("decide_proposal", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Decisão registrada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    forecasts: forecastsQuery.data?.forecasts || [],
    signals: signalsQuery.data?.signals || [],
    proposals: proposalsQuery.data?.proposals || [],
    loading: forecastsQuery.isLoading,
    generateForecasts,
    generateProposals,
    decideProposal,
  };
}
