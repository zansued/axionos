import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function usePredictiveErrorDashboard() {
  const { currentOrg } = useOrg();

  const { data: assessments = [], isLoading: assessmentsLoading } = useQuery({
    queryKey: ["predictive-risk-assessments", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("predictive_risk_assessments")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg,
  });

  const { data: actions = [], isLoading: actionsLoading } = useQuery({
    queryKey: ["predictive-preventive-actions", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("predictive_preventive_actions")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg,
  });

  const byBand = assessments.reduce((acc: Record<string, number>, a: any) => {
    acc[a.risk_band] = (acc[a.risk_band] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const appliedActions = actions.filter((a: any) => a.applied);
  const helpfulActions = actions.filter((a: any) => a.outcome_status === "helpful");
  const falsePositives = actions.filter((a: any) => a.outcome_status === "neutral" && a.applied);
  const harmfulActions = actions.filter((a: any) => a.outcome_status === "harmful");

  return {
    assessments,
    actions,
    byBand,
    appliedActions,
    helpfulActions,
    falsePositives,
    harmfulActions,
    isLoading: assessmentsLoading || actionsLoading,
  };
}
