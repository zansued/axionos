import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export type ColdStartLabel = "cold_start" | "low_confidence" | "insufficient_history" | "ready";

export interface ColdStartSignal {
  dimension: string;
  current_value: number;
  required_value: number;
  met: boolean;
  explanation: string;
}

export interface ColdStartResult {
  label: ColdStartLabel;
  is_cold_start: boolean;
  signals: ColdStartSignal[];
  summary: string;
}

export function useColdStart() {
  const { currentOrg } = useOrg();

  return useQuery<ColdStartResult>({
    queryKey: ["cold-start-status", currentOrg?.id],
    enabled: !!currentOrg,
    staleTime: 60_000,
    queryFn: async () => {
      if (!currentOrg) throw new Error("No org");

      // Gather counts in parallel
      const [execRes, adjRes, scoreRes, stackRes] = await Promise.all([
        supabase
          .from("execution_validation_runs")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrg.id),
        supabase
          .from("autonomy_adjustment_events")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrg.id),
        supabase
          .from("compounding_advantage_scores")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrg.id),
        supabase
          .from("execution_validation_runs")
          .select("stack_id")
          .eq("organization_id", currentOrg.id),
      ]);

      const execCount = execRes.count ?? 0;
      const adjCount = adjRes.count ?? 0;
      const scoreCount = scoreRes.count ?? 0;
      const uniqueStacks = new Set((stackRes.data ?? []).map((r: any) => r.stack_id)).size;
      const tenantCreatedAt = (currentOrg as any).created_at || new Date().toISOString();

      // Client-side detection mirrors shared logic
      const MIN_EXEC = 20;
      const MIN_AGE = 7;
      const MIN_STACKS = 2;
      const MIN_ADJ = 5;
      const MIN_SCORES = 3;

      const daysSince = (Date.now() - new Date(tenantCreatedAt).getTime()) / (1000 * 60 * 60 * 24);

      const signals: ColdStartSignal[] = [
        { dimension: "execution_count", current_value: execCount, required_value: MIN_EXEC, met: execCount >= MIN_EXEC, explanation: execCount < MIN_EXEC ? `Only ${execCount} executions (${MIN_EXEC} required).` : "Sufficient executions." },
        { dimension: "tenant_age_days", current_value: Math.round(daysSince), required_value: MIN_AGE, met: daysSince >= MIN_AGE, explanation: daysSince < MIN_AGE ? `Tenant is ${Math.round(daysSince)}d old (${MIN_AGE}d required).` : "Sufficient maturity." },
        { dimension: "stack_history", current_value: uniqueStacks, required_value: MIN_STACKS, met: uniqueStacks >= MIN_STACKS, explanation: uniqueStacks < MIN_STACKS ? `${uniqueStacks} stack(s) (${MIN_STACKS} required).` : "Sufficient stack diversity." },
        { dimension: "autonomy_adjustments", current_value: adjCount, required_value: MIN_ADJ, met: adjCount >= MIN_ADJ, explanation: adjCount < MIN_ADJ ? `${adjCount} adjustments (${MIN_ADJ} required).` : "Sufficient autonomy data." },
        { dimension: "compounding_scores", current_value: scoreCount, required_value: MIN_SCORES, met: scoreCount >= MIN_SCORES, explanation: scoreCount < MIN_SCORES ? `${scoreCount} scores (${MIN_SCORES} required).` : "Sufficient compounding data." },
      ];

      const unmet = signals.filter((s) => !s.met);
      const metCount = signals.length - unmet.length;

      let label: ColdStartLabel;
      let summary: string;

      if (metCount === signals.length) {
        label = "ready";
        summary = "All data maturity thresholds met. Metrics are reliable.";
      } else if (metCount >= 3) {
        label = "low_confidence";
        summary = `Some metrics have limited confidence: ${unmet.map((s) => s.dimension).join(", ")}.`;
      } else if (metCount >= 1) {
        label = "insufficient_history";
        summary = `Insufficient history for reliable scoring. ${unmet.length}/${signals.length} thresholds unmet.`;
      } else {
        label = "cold_start";
        summary = "System is in cold start. All metrics should be interpreted with caution.";
      }

      return { label, is_cold_start: label !== "ready", signals, summary };
    },
  });
}
