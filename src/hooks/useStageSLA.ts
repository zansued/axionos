import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export interface SLAConfig {
  id: string;
  organization_id: string;
  stage: string;
  max_hours: number;
  alert_enabled: boolean;
}

export interface SLABreach {
  initiativeId: string;
  initiativeTitle: string;
  stage: string;
  hoursStuck: number;
  maxHours: number;
  severity: "warning" | "critical";
}

const DEFAULT_SLAS: Record<string, number> = {
  draft: 48,
  discovered: 24,
  squad_formed: 24,
  planned: 24,
  in_progress: 72,
  validating: 24,
  ready_to_publish: 48,
};

export function useSLAConfigs() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["sla-configs", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stage_sla_configs")
        .select("*")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data as SLAConfig[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (config: { stage: string; max_hours: number; alert_enabled: boolean }) => {
      const existing = configs.find((c) => c.stage === config.stage);
      if (existing) {
        const { error } = await supabase
          .from("stage_sla_configs")
          .update({ max_hours: config.max_hours, alert_enabled: config.alert_enabled, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("stage_sla_configs")
          .insert({ organization_id: orgId!, stage: config.stage, max_hours: config.max_hours, alert_enabled: config.alert_enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sla-configs", orgId] }),
  });

  const getMaxHours = (stage: string): number => {
    const config = configs.find((c) => c.stage === stage);
    return config?.max_hours ?? DEFAULT_SLAS[stage] ?? 48;
  };

  const isAlertEnabled = (stage: string): boolean => {
    const config = configs.find((c) => c.stage === stage);
    return config?.alert_enabled ?? true;
  };

  return { configs, isLoading, upsertConfig: upsertMutation.mutateAsync, getMaxHours, isAlertEnabled, defaultSLAs: DEFAULT_SLAS };
}

export function useSLABreaches(initiatives: any[]) {
  const { configs, getMaxHours, isAlertEnabled } = useSLAConfigs();

  const breaches: SLABreach[] = initiatives
    .filter((init) => !["completed", "rejected", "archived"].includes(init.stage_status))
    .map((init) => {
      const stage = init.stage_status;
      if (!isAlertEnabled(stage)) return null;
      const maxHours = getMaxHours(stage);
      const updatedAt = new Date(init.updated_at).getTime();
      const hoursStuck = (Date.now() - updatedAt) / (1000 * 60 * 60);
      if (hoursStuck < maxHours) return null;
      return {
        initiativeId: init.id,
        initiativeTitle: init.title,
        stage,
        hoursStuck: Math.round(hoursStuck),
        maxHours,
        severity: hoursStuck >= maxHours * 2 ? "critical" : "warning",
      } as SLABreach;
    })
    .filter(Boolean) as SLABreach[];

  return { breaches, hasCritical: breaches.some((b) => b.severity === "critical") };
}
