import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useKnowledgePortfolio() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("knowledge-portfolio-engine", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const KEYS = {
    snapshots: ["portfolio-snapshots", currentOrg?.id],
    segments: ["portfolio-segments", currentOrg?.id],
    proposals: ["portfolio-proposals", currentOrg?.id],
  };

  const invalidateAll = () => {
    Object.values(KEYS).forEach((k) => qc.invalidateQueries({ queryKey: k }));
  };

  const snapshotsQuery = useQuery({
    queryKey: KEYS.snapshots,
    queryFn: () => invoke("list_snapshots"),
    enabled: !!currentOrg,
  });

  const segmentsQuery = useQuery({
    queryKey: KEYS.segments,
    queryFn: () => invoke("list_segments"),
    enabled: !!currentOrg,
  });

  const proposalsQuery = useQuery({
    queryKey: KEYS.proposals,
    queryFn: () => invoke("list_proposals"),
    enabled: !!currentOrg,
  });

  const analyzePortfolio = useMutation({
    mutationFn: () => invoke("analyze_portfolio"),
    onSuccess: (d) => {
      invalidateAll();
      toast({ title: "Análise concluída", description: `Portfolio score: ${(d.metrics?.portfolio_score * 100).toFixed(0)}%` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const detectRedundancies = useMutation({
    mutationFn: () => invoke("detect_redundancies"),
    onSuccess: (d) => {
      toast({ title: "Redundâncias detectadas", description: `${d.clusters?.length || 0} clusters encontrados` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const analyzeCoverage = useMutation({
    mutationFn: () => invoke("analyze_coverage"),
    onSuccess: (d) => {
      toast({ title: "Cobertura analisada", description: `${d.gaps?.length || 0} lacunas, ${d.strong_domains?.length || 0} domínios fortes` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const generateProposals = useMutation({
    mutationFn: () => invoke("generate_optimization_proposals"),
    onSuccess: (d) => {
      invalidateAll();
      toast({ title: "Propostas geradas", description: `${d.proposals_created || 0} propostas criadas` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const decideProposal = useMutation({
    mutationFn: (params: { proposalId: string; decision: string; notes?: string }) =>
      invoke("decide_proposal", params),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Decisão registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const latestSnapshot = snapshotsQuery.data?.snapshots?.[0] || null;

  return {
    snapshots: snapshotsQuery.data?.snapshots || [],
    segments: segmentsQuery.data?.segments || [],
    proposals: proposalsQuery.data?.proposals || [],
    latestSnapshot,
    loading: snapshotsQuery.isLoading,
    analyzePortfolio,
    detectRedundancies,
    analyzeCoverage,
    generateProposals,
    decideProposal,
  };
}
