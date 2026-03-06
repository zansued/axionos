import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InitiativeMetrics {
  initiative_id: string;
  pipeline_success_rate: number;
  build_success_rate: number;
  deploy_success_rate: number;
  time_idea_to_repo_seconds: number | null;
  time_idea_to_deploy_seconds: number | null;
  cost_per_initiative_usd: number;
  tokens_total: number;
  models_used: string[];
  average_retries_per_initiative: number;
  automatic_repair_success_rate: number;
  stage_failure_distribution: Record<string, number>;
  stage_durations: Record<string, number>;
  stage_costs: Record<string, number>;
  initiative_outcome_status: string;
  computed_at: string;
}

export function useInitiativeObservability(initiativeId: string | null) {
  return useQuery<InitiativeMetrics | null>({
    queryKey: ["initiative-observability", initiativeId],
    enabled: !!initiativeId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "initiative-observability-engine",
        { body: { initiative_id: initiativeId } },
      );
      if (error) throw error;
      return data as InitiativeMetrics;
    },
    staleTime: 30_000,
  });
}
