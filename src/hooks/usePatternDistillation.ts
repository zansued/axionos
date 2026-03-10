import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function usePatternDistillation() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("pattern-distillation-engine", {
      body: { action, organization_id: orgId, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const PATTERNS_KEY = ["pattern-distillation", orgId];
  const SUMMARY_KEY = ["pattern-distillation-summary", orgId];

  const patternsQuery = useQuery({
    queryKey: PATTERNS_KEY,
    queryFn: () => invoke("list_patterns"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const summaryQuery = useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: () => invoke("pattern_summary"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: PATTERNS_KEY });
    qc.invalidateQueries({ queryKey: SUMMARY_KEY });
  };

  const scanCandidates = useMutation({
    mutationFn: () => invoke("scan_learning_candidates"),
    onSuccess: () => { invalidateAll(); toast({ title: "Distillation complete" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const computeGeneralization = useMutation({
    mutationFn: (patternSignature: string) => invoke("compute_generalization", { pattern_signature: patternSignature }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    patterns: patternsQuery.data?.patterns || [],
    patternsLoading: patternsQuery.isLoading,
    summary: summaryQuery.data,
    summaryLoading: summaryQuery.isLoading,
    scanCandidates,
    computeGeneralization,
  };
}
