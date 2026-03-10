import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";

interface LoopRecord {
  loop_id: string;
  organization_id: string;
  domain_id: string;
  loop_type: string;
  loop_status: string;
  loop_priority: number;
  loop_health: string;
  loop_metrics: Record<string, unknown>;
  last_activity: string;
}

interface HealthReport {
  loop_type: string;
  current_health: string;
  evaluated_health: string;
  priority: number;
  last_activity: string;
  needs_update: boolean;
}

interface LoopMetrics {
  total_loops: number;
  health_distribution: Record<string, number>;
  priority_by_type: Record<string, number>;
  average_priority: number;
  imbalance: { imbalanced: boolean; dominant: string | null; starved: string[] };
}

export function useMultiLoopOrchestrator() {
  const { currentOrg } = useOrg();
  const [loops, setLoops] = useState<LoopRecord[]>([]);
  const [healthReport, setHealthReport] = useState<HealthReport[]>([]);
  const [metrics, setMetrics] = useState<LoopMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const invoke = useCallback(async (action: string) => {
    if (!currentOrg) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("multi-loop-orchestrator", {
        body: { action, organization_id: currentOrg.id },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      toast.error(`Loop orchestrator error: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  const listLoops = useCallback(async () => {
    const data = await invoke("list_loops");
    if (data?.loops) setLoops(data.loops);
  }, [invoke]);

  const evaluateHealth = useCallback(async () => {
    const data = await invoke("evaluate_loop_health");
    if (data?.health_report) {
      setHealthReport(data.health_report);
      toast.success("Loop health evaluated");
    }
  }, [invoke]);

  const rebalance = useCallback(async () => {
    const data = await invoke("rebalance_loop_priorities");
    if (data) {
      toast.success(`Rebalanced ${data.applied} loop(s)`);
      await listLoops();
    }
  }, [invoke, listLoops]);

  const fetchMetrics = useCallback(async () => {
    const data = await invoke("loop_metrics");
    if (data) setMetrics(data);
  }, [invoke]);

  return { loops, healthReport, metrics, loading, listLoops, evaluateHealth, rebalance, fetchMetrics };
}
