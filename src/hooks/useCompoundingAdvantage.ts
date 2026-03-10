import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useCompoundingAdvantage() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("compounding-advantage-engine", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const MOATS_KEY = ["moat-domains", currentOrg?.id];
  const SCORES_KEY = ["compounding-scores", currentOrg?.id];
  const PACKS_KEY = ["doctrine-packs", currentOrg?.id];
  const WEAK_KEY = ["weak-zones", currentOrg?.id];

  const moatsQuery = useQuery({ queryKey: MOATS_KEY, queryFn: () => invoke("list_moat_domains"), enabled: !!currentOrg, refetchInterval: 30000 });
  const scoresQuery = useQuery({ queryKey: SCORES_KEY, queryFn: () => invoke("list_scores"), enabled: !!currentOrg });
  const packsQuery = useQuery({ queryKey: PACKS_KEY, queryFn: () => invoke("list_doctrine_packs"), enabled: !!currentOrg });
  const weakQuery = useQuery({ queryKey: WEAK_KEY, queryFn: () => invoke("list_weak_compounding_zones"), enabled: !!currentOrg });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: MOATS_KEY });
    qc.invalidateQueries({ queryKey: SCORES_KEY });
    qc.invalidateQueries({ queryKey: PACKS_KEY });
    qc.invalidateQueries({ queryKey: WEAK_KEY });
  };

  const computeScores = useMutation({
    mutationFn: (p: Record<string, any>) => invoke("compute_compounding_scores", p),
    onSuccess: () => { invalidateAll(); toast({ title: "Scores computed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const detectMoat = useMutation({
    mutationFn: (p: Record<string, any>) => invoke("detect_moat_domains", p),
    onSuccess: () => { invalidateAll(); toast({ title: "Moat detection complete" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const explainProfile = useMutation({
    mutationFn: (p: Record<string, any>) => invoke("explain_advantage_profile", p),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    moats: moatsQuery.data?.domains || [],
    scores: scoresQuery.data?.scores || [],
    packs: packsQuery.data?.packs || [],
    weakZones: weakQuery.data?.zones || [],
    loadingMoats: moatsQuery.isLoading,
    computeScores,
    detectMoat,
    explainProfile,
  };
}
