import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSystemHealth(organizationId: string | null) {
  const qc = useQueryClient();
  const autoEvalTriggered = useRef(false);

  const metrics = useQuery({
    queryKey: ["system-health-metrics", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("system-health-engine", {
        body: { action: "health_metrics", organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 120_000,
    refetchInterval: 120_000,
  });

  const trend = useQuery({
    queryKey: ["system-health-trend", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("system-health-engine", {
        body: { action: "health_trend", organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 120_000,
    refetchInterval: 120_000,
  });

  const evaluate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("system-health-engine", {
        body: { action: "evaluate_system_health", organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-health-metrics"] });
      qc.invalidateQueries({ queryKey: ["system-health-trend"] });
    },
  });

  // Auto-evaluate on first load if no metrics exist
  useEffect(() => {
    if (
      organizationId &&
      !autoEvalTriggered.current &&
      metrics.isFetched &&
      !metrics.isLoading &&
      (!metrics.data?.metrics || metrics.data.metrics.length === 0)
    ) {
      autoEvalTriggered.current = true;
      evaluate.mutate();
    }
  }, [organizationId, metrics.isFetched, metrics.isLoading, metrics.data]);

  return { metrics, trend, evaluate };
}
