import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RuntimeValidationMetrics {
  total_runs: number;
  system_validation_success_rate: number;
  rollback_rate: number;
  repair_success_rate: number;
  guardrail_breach_rate: number;
  publish_reliability: number;
  avg_execution_duration_ms: number;
  avg_execution_cost_usd: number;
  runs: any[];
}

export function useExecutionHarness(organizationId: string | null) {
  return useQuery<RuntimeValidationMetrics | null>({
    queryKey: ["execution-harness-metrics", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "execution-harness-run",
        {
          body: {
            action: "compute_runtime_validation_metrics",
            organization_id: organizationId,
          },
        }
      );
      if (error) throw error;
      return data as RuntimeValidationMetrics;
    },
    staleTime: 30_000,
  });
}
