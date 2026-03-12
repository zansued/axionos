import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function invokeMonitoring(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("security-monitoring-engine", {
    body: { action, ...params },
  });
  if (error) throw error;
  return data;
}

export function useSecurityMonitoringOverview(orgId?: string) {
  return useQuery({
    queryKey: ["security-monitoring", "overview", orgId],
    queryFn: () => invokeMonitoring("overview", { organization_id: orgId }),
    enabled: !!orgId,
    refetchInterval: 30_000,
  });
}

export function useSecurityMonitoringAlerts(orgId?: string) {
  return useQuery({
    queryKey: ["security-monitoring", "alerts", orgId],
    queryFn: () => invokeMonitoring("list_alerts", { organization_id: orgId }),
    enabled: !!orgId,
    refetchInterval: 15_000,
  });
}

export function useSecurityMonitoringSignals(orgId?: string) {
  return useQuery({
    queryKey: ["security-monitoring", "signals", orgId],
    queryFn: () => invokeMonitoring("list_signals", { organization_id: orgId }),
    enabled: !!orgId,
  });
}

export function useRunSecurityScan(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => invokeMonitoring("run_scan", { organization_id: orgId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-monitoring"] });
    },
  });
}

export function useAlertAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, alertId, orgId, notes }: { action: string; alertId: string; orgId?: string; notes?: string }) =>
      invokeMonitoring(action, { alert_id: alertId, organization_id: orgId, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-monitoring"] });
    },
  });
}

export function useCorrelateAlerts(orgId?: string) {
  return useMutation({
    mutationFn: () => invokeMonitoring("correlate_alerts", { organization_id: orgId }),
  });
}
