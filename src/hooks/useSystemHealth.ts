import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSystemHealth(organizationId: string | null) {
  const qc = useQueryClient();

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
    staleTime: 30_000,
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
    staleTime: 60_000,
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

  return { metrics, trend, evaluate };
}
