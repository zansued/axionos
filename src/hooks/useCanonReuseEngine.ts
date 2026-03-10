import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useCanonReuseEngine() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("canon-reuse-engine", {
      body: { action, organization_id: orgId, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const RULES_KEY = ["canon-reuse-rules", orgId];
  const METRICS_KEY = ["canon-reuse-metrics", orgId];

  const rulesQuery = useQuery({
    queryKey: RULES_KEY,
    queryFn: () => invoke("list_reuse_rules"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const metricsQuery = useQuery({
    queryKey: METRICS_KEY,
    queryFn: () => invoke("reuse_metrics"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: RULES_KEY });
    qc.invalidateQueries({ queryKey: METRICS_KEY });
  };

  const applyGuidance = useMutation({
    mutationFn: () => invoke("apply_canon_guidance"),
    onSuccess: (data) => { invalidateAll(); toast({ title: data?.message || "Guidance applied" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const activateRule = useMutation({
    mutationFn: (ruleId: string) => invoke("activate_rule", { rule_id: ruleId }),
    onSuccess: () => { invalidateAll(); toast({ title: "Rule activated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deactivateRule = useMutation({
    mutationFn: (ruleId: string) => invoke("deactivate_rule", { rule_id: ruleId }),
    onSuccess: () => { invalidateAll(); toast({ title: "Rule set to advisory" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    rules: rulesQuery.data?.rules || [],
    rulesLoading: rulesQuery.isLoading,
    metrics: metricsQuery.data,
    metricsLoading: metricsQuery.isLoading,
    applyGuidance,
    activateRule,
    deactivateRule,
  };
}
