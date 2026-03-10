import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useOperationalPosture() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("operational-posture-engine", {
      body: { action, organization_id: orgId, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const POSTURES_KEY = ["operational-postures", orgId];
  const METRICS_KEY = ["operational-posture-metrics", orgId];

  const posturesQuery = useQuery({
    queryKey: POSTURES_KEY,
    queryFn: () => invoke("get_current_posture"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const metricsQuery = useQuery({
    queryKey: METRICS_KEY,
    queryFn: () => invoke("posture_metrics"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: POSTURES_KEY });
    qc.invalidateQueries({ queryKey: METRICS_KEY });
  };

  const evaluatePosture = useMutation({
    mutationFn: (params?: { tenant_id?: string; stack_id?: string }) => invoke("evaluate_posture", params || {}),
    onSuccess: () => { invalidateAll(); toast({ title: "Posture evaluated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    postures: posturesQuery.data?.postures || [],
    posturesLoading: posturesQuery.isLoading,
    metrics: metricsQuery.data,
    metricsLoading: metricsQuery.isLoading,
    evaluatePosture,
  };
}
