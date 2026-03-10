import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useOutcomeAutonomy() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("outcome-based-autonomy", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const DOMAINS_KEY = ["autonomy-domains", currentOrg?.id];
  const ADJUSTMENTS_KEY = ["autonomy-adjustments", currentOrg?.id];
  const BREACHES_KEY = ["autonomy-breaches", currentOrg?.id];
  const REGRESSIONS_KEY = ["autonomy-regressions", currentOrg?.id];
  const TRANSITIONS_KEY = ["autonomy-transition-metrics", currentOrg?.id];
  const PROFILE_KEY = ["autonomy-regression-profile", currentOrg?.id];

  const domainsQuery = useQuery({
    queryKey: DOMAINS_KEY,
    queryFn: () => invoke("list_domains"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const adjustmentsQuery = useQuery({
    queryKey: ADJUSTMENTS_KEY,
    queryFn: () => invoke("list_adjustments"),
    enabled: !!currentOrg,
  });

  const breachesQuery = useQuery({
    queryKey: BREACHES_KEY,
    queryFn: () => invoke("list_breaches"),
    enabled: !!currentOrg,
  });

  const regressionsQuery = useQuery({
    queryKey: REGRESSIONS_KEY,
    queryFn: () => invoke("list_regressions"),
    enabled: !!currentOrg,
  });

  const transitionMetricsQuery = useQuery({
    queryKey: TRANSITIONS_KEY,
    queryFn: () => invoke("transition_metrics"),
    enabled: !!currentOrg,
  });

  const regressionProfileQuery = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => invoke("get_regression_profile"),
    enabled: !!currentOrg,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: DOMAINS_KEY });
    qc.invalidateQueries({ queryKey: ADJUSTMENTS_KEY });
    qc.invalidateQueries({ queryKey: BREACHES_KEY });
    qc.invalidateQueries({ queryKey: REGRESSIONS_KEY });
    qc.invalidateQueries({ queryKey: TRANSITIONS_KEY });
    qc.invalidateQueries({ queryKey: PROFILE_KEY });
  };

  const scoreAutonomy = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("score_autonomy", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Autonomy scored" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const adjustLevel = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("adjust_level", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Autonomy level adjusted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const registerBreach = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("register_guardrail_breach", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Breach registered" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const downgradeAutonomy = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("downgrade_autonomy", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Downgrade evaluated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const explainPosture = useMutation({
    mutationFn: (domainId: string) => invoke("explain_autonomy_posture", { domain_id: domainId }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const setRegressionProfile = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("set_regression_profile", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Regression profile updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    domains: domainsQuery.data?.domains || [],
    adjustments: adjustmentsQuery.data?.adjustments || [],
    breaches: breachesQuery.data?.breaches || [],
    regressions: regressionsQuery.data?.regressions || [],
    transitionMetrics: transitionMetricsQuery.data || null,
    regressionProfile: regressionProfileQuery.data || null,
    loadingDomains: domainsQuery.isLoading,
    scoreAutonomy,
    adjustLevel,
    registerBreach,
    downgradeAutonomy,
    explainPosture,
    setRegressionProfile,
  };
}
