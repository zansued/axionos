import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useAttentionAllocation() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("attention-allocation-engine", {
      body: { action, organization_id: orgId, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const DOMAINS_KEY = ["attention-domains", orgId];
  const METRICS_KEY = ["attention-metrics", orgId];

  const domainsQuery = useQuery({
    queryKey: DOMAINS_KEY,
    queryFn: () => invoke("list_attention_domains"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const metricsQuery = useQuery({
    queryKey: METRICS_KEY,
    queryFn: () => invoke("attention_metrics"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: DOMAINS_KEY });
    qc.invalidateQueries({ queryKey: METRICS_KEY });
  };

  const computeAttention = useMutation({
    mutationFn: (params?: Record<string, any>) => invoke("compute_attention_map", params || {}),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Attention map computed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    domains: domainsQuery.data?.domains || [],
    domainsLoading: domainsQuery.isLoading,
    metrics: metricsQuery.data,
    metricsLoading: metricsQuery.isLoading,
    computeAttention,
  };
}
