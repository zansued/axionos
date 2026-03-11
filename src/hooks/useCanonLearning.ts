import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useCanonLearning() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("canon-learning", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const KEYS = {
    candidates: ["canon-learning-candidates", currentOrg?.id],
    signals: ["canon-learning-signals", currentOrg?.id],
    failurePatterns: ["canon-failure-patterns", currentOrg?.id],
    refactorPatterns: ["canon-refactor-patterns", currentOrg?.id],
    successPatterns: ["canon-success-patterns", currentOrg?.id],
    validationPatterns: ["canon-validation-patterns", currentOrg?.id],
    reviews: ["canon-candidate-reviews", currentOrg?.id],
  };

  const candidatesQ = useQuery({ queryKey: KEYS.candidates, queryFn: () => invoke("list_candidates"), enabled: !!currentOrg, refetchInterval: 30000 });
  const signalsQ = useQuery({ queryKey: KEYS.signals, queryFn: () => invoke("list_signals"), enabled: !!currentOrg, refetchInterval: 30000 });
  const failureQ = useQuery({ queryKey: KEYS.failurePatterns, queryFn: () => invoke("list_failure_patterns"), enabled: !!currentOrg, refetchInterval: 30000 });
  const refactorQ = useQuery({ queryKey: KEYS.refactorPatterns, queryFn: () => invoke("list_refactor_patterns"), enabled: !!currentOrg, refetchInterval: 30000 });
  const successQ = useQuery({ queryKey: KEYS.successPatterns, queryFn: () => invoke("list_success_patterns"), enabled: !!currentOrg, refetchInterval: 30000 });
  const validationQ = useQuery({ queryKey: KEYS.validationPatterns, queryFn: () => invoke("list_validation_patterns"), enabled: !!currentOrg, refetchInterval: 30000 });
  const reviewsQ = useQuery({ queryKey: KEYS.reviews, queryFn: () => invoke("list_reviews"), enabled: !!currentOrg, refetchInterval: 30000 });

  const invalidateAll = () => Object.values(KEYS).forEach(k => qc.invalidateQueries({ queryKey: k }));

  const submitReview = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("submit_review", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Review submitted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    candidates: candidatesQ.data?.candidates || [],
    signals: signalsQ.data?.signals || [],
    failurePatterns: failureQ.data?.patterns || [],
    refactorPatterns: refactorQ.data?.patterns || [],
    successPatterns: successQ.data?.patterns || [],
    validationPatterns: validationQ.data?.patterns || [],
    reviews: reviewsQ.data?.reviews || [],
    loading: candidatesQ.isLoading || signalsQ.isLoading,
    submitReview,
  };
}
