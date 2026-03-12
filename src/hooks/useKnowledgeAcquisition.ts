import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useKnowledgeAcquisition() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("knowledge-acquisition-planner", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const KEYS = {
    opportunities: ["acquisition-opportunities", currentOrg?.id],
    plans: ["acquisition-plans", currentOrg?.id],
    budgets: ["acquisition-budgets", currentOrg?.id],
  };

  const invalidateAll = () => Object.values(KEYS).forEach((k) => qc.invalidateQueries({ queryKey: k }));

  const opportunitiesQuery = useQuery({ queryKey: KEYS.opportunities, queryFn: () => invoke("list_opportunities"), enabled: !!currentOrg });
  const plansQuery = useQuery({ queryKey: KEYS.plans, queryFn: () => invoke("list_plans"), enabled: !!currentOrg });
  const budgetsQuery = useQuery({ queryKey: KEYS.budgets, queryFn: () => invoke("list_budgets"), enabled: !!currentOrg });

  const rankOpportunities = useMutation({
    mutationFn: () => invoke("rank_opportunities"),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Oportunidades ranqueadas", description: `${d.total_ranked} oportunidades` }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const generatePlan = useMutation({
    mutationFn: (params: { targetDomain?: string; strategyMode?: string }) => invoke("generate_plan", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Plano gerado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const decidePlan = useMutation({
    mutationFn: (params: { planId: string; decision: string }) => invoke("decide_plan", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Decisão registrada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    opportunities: opportunitiesQuery.data?.opportunities || [],
    plans: plansQuery.data?.plans || [],
    budgets: budgetsQuery.data?.budgets || [],
    loading: opportunitiesQuery.isLoading,
    rankOpportunities,
    generatePlan,
    decidePlan,
  };
}
