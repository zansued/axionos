import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export interface OrgUsageLimits {
  id: string;
  organization_id: string;
  monthly_budget_usd: number;
  alert_threshold_pct: number;
  hard_limit: boolean;
}

export interface MonthlySnapshot {
  month_start: string;
  total_jobs: number;
  total_cost_usd: number;
  total_tokens: number;
  total_artifacts: number;
}

export interface CurrentMonthUsage {
  totalCost: number;
  totalJobs: number;
  totalTokens: number;
  totalArtifacts: number;
  costByStage: { stage: string; cost: number; count: number }[];
  costByDay: { day: string; cost: number }[];
}

export function useOrgUsage() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch limits
  const limitsQuery = useQuery({
    queryKey: ["org-usage-limits", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) throw new Error("No org");
      const { data, error } = await supabase
        .from("org_usage_limits")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .maybeSingle();
      if (error) throw error;
      return data as OrgUsageLimits | null;
    },
    enabled: !!currentOrg,
  });

  // Fetch current month usage from initiative_jobs + agent_outputs
  const currentUsageQuery = useQuery<CurrentMonthUsage>({
    queryKey: ["org-current-usage", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) throw new Error("No org");
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [jobsRes, initRes, outputsRes] = await Promise.all([
        supabase
          .from("initiative_jobs")
          .select("id, initiative_id, stage, cost_usd, created_at")
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("initiatives")
          .select("id")
          .eq("organization_id", currentOrg.id),
        supabase
          .from("agent_outputs")
          .select("id, cost_estimate, tokens_used, created_at")
          .eq("organization_id", currentOrg.id)
          .gte("created_at", monthStart.toISOString()),
      ]);

      const initIds = new Set((initRes.data || []).map(i => i.id));
      const orgJobs = (jobsRes.data || []).filter(j => initIds.has(j.initiative_id));
      const outputs = outputsRes.data || [];

      const totalCost = orgJobs.reduce((s, j) => s + (Number(j.cost_usd) || 0), 0);
      const totalTokens = outputs.reduce((s, o) => s + (o.tokens_used || 0), 0);

      // Cost by stage
      const stageCosts: Record<string, { cost: number; count: number }> = {};
      orgJobs.forEach(j => {
        if (!stageCosts[j.stage]) stageCosts[j.stage] = { cost: 0, count: 0 };
        stageCosts[j.stage].cost += Number(j.cost_usd) || 0;
        stageCosts[j.stage].count += 1;
      });

      // Cost by day
      const dayCosts: Record<string, number> = {};
      orgJobs.forEach(j => {
        const day = j.created_at.slice(0, 10);
        dayCosts[day] = (dayCosts[day] || 0) + (Number(j.cost_usd) || 0);
      });

      return {
        totalCost,
        totalJobs: orgJobs.length,
        totalTokens,
        totalArtifacts: outputs.length,
        costByStage: Object.entries(stageCosts).map(([stage, v]) => ({ stage, ...v })),
        costByDay: Object.entries(dayCosts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, cost]) => ({ day, cost: Number(cost.toFixed(4)) })),
      };
    },
    enabled: !!currentOrg,
  });

  // Historical snapshots
  const historyQuery = useQuery({
    queryKey: ["org-usage-history", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) throw new Error("No org");
      const { data, error } = await supabase
        .from("usage_monthly_snapshots")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("month_start", { ascending: true });
      if (error) throw error;
      return (data || []) as MonthlySnapshot[];
    },
    enabled: !!currentOrg,
  });

  // Save limits
  const saveLimits = useMutation({
    mutationFn: async (limits: { monthly_budget_usd: number; alert_threshold_pct: number; hard_limit: boolean }) => {
      if (!currentOrg) throw new Error("No org");
      const { error } = await supabase
        .from("org_usage_limits")
        .upsert({
          organization_id: currentOrg.id,
          ...limits,
        }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-usage-limits"] });
      toast({ title: "Limites atualizados", description: "Configurações de uso salvas com sucesso." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  return {
    limits: limitsQuery.data,
    limitsLoading: limitsQuery.isLoading,
    currentUsage: currentUsageQuery.data,
    usageLoading: currentUsageQuery.isLoading,
    history: historyQuery.data || [],
    historyLoading: historyQuery.isLoading,
    saveLimits,
  };
}
