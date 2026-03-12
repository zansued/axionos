import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

function invoke(fnName: string, body: Record<string, any>) {
  return supabase.functions.invoke(fnName, { body }).then(({ data, error }) => {
    if (error) throw error;
    return data;
  });
}

export function useRepoTrustScore() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const trustScores = useQuery({
    queryKey: ["repo-trust-scores", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repo_trust_scores")
        .select("*")
        .eq("organization_id", orgId!)
        .order("trust_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const patternWeights = useQuery({
    queryKey: ["pattern-weight-factors", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pattern_weight_factors")
        .select("*")
        .eq("organization_id", orgId!)
        .order("pattern_weight", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const recalibrationLog = useQuery({
    queryKey: ["confidence-recalibration-log", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("confidence_recalibration_log")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["repo-trust-scores"] });
    qc.invalidateQueries({ queryKey: ["pattern-weight-factors"] });
    qc.invalidateQueries({ queryKey: ["confidence-recalibration-log"] });
  };

  const evaluateSources = useMutation({
    mutationFn: () => invoke("repo-trust-score-engine", { action: "evaluate_sources", organization_id: orgId }),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Sources evaluated", description: `${d?.evaluated || 0} sources scored` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const weightPatterns = useMutation({
    mutationFn: () => invoke("repo-trust-score-engine", { action: "weight_patterns", organization_id: orgId }),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Patterns weighted", description: `${d?.weighted || 0} patterns scored` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const recalibrateConfidence = useMutation({
    mutationFn: () => invoke("repo-trust-score-engine", { action: "recalibrate_confidence", organization_id: orgId }),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Confidence recalibrated", description: `${d?.recalibrated || 0} entries adjusted` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    trustScores,
    patternWeights,
    recalibrationLog,
    evaluateSources,
    weightPatterns,
    recalibrateConfidence,
    loading: trustScores.isLoading || patternWeights.isLoading,
  };
}
