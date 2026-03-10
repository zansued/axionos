import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useOperationalCycles() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("operational-cycle-engine", {
      body: { action, organization_id: orgId, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const CYCLES_KEY = ["operational-cycles", orgId];
  const METRICS_KEY = ["operational-cycle-metrics", orgId];

  const cyclesQuery = useQuery({
    queryKey: CYCLES_KEY,
    queryFn: () => invoke("list_cycles"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const metricsQuery = useQuery({
    queryKey: METRICS_KEY,
    queryFn: () => invoke("cycle_metrics"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: CYCLES_KEY });
    qc.invalidateQueries({ queryKey: METRICS_KEY });
  };

  const startCycle = useMutation({
    mutationFn: (params?: Record<string, any>) => invoke("start_cycle", params || {}),
    onSuccess: () => { invalidateAll(); toast({ title: "Cycle started" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const evaluateCycle = useMutation({
    mutationFn: () => invoke("evaluate_cycle"),
    onSuccess: () => { invalidateAll(); toast({ title: "Cycle evaluated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const endCycle = useMutation({
    mutationFn: (params?: Record<string, any>) => invoke("end_cycle", params || {}),
    onSuccess: () => { invalidateAll(); toast({ title: "Cycle ended" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    cycles: cyclesQuery.data?.cycles || [],
    cyclesLoading: cyclesQuery.isLoading,
    metrics: metricsQuery.data,
    metricsLoading: metricsQuery.isLoading,
    startCycle,
    evaluateCycle,
    endCycle,
  };
}
