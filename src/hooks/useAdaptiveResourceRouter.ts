import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useAdaptiveResourceRouter() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("adaptive-resource-router", {
      body: { action, organization_id: orgId, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const METRICS_KEY = ["adaptive-routing-metrics", orgId];

  const metricsQuery = useQuery({
    queryKey: METRICS_KEY,
    queryFn: () => invoke("routing_metrics"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: METRICS_KEY });
  };

  const computeProfile = useMutation({
    mutationFn: (params?: Record<string, any>) => invoke("compute_routing_profile", params || {}),
    onSuccess: () => { invalidateAll(); toast({ title: "Routing profiles computed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    profiles: metricsQuery.data?.profiles || [],
    metrics: metricsQuery.data,
    metricsLoading: metricsQuery.isLoading,
    computeProfile,
  };
}
