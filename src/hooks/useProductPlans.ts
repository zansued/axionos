import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export interface ProductPlan {
  id: string;
  plan_name: string;
  monthly_price_usd: number;
  max_initiatives_per_month: number;
  max_tokens_per_month: number;
  max_deployments_per_month: number;
  max_parallel_runs: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface BillingAccount {
  id: string;
  organization_id: string;
  plan_id: string;
  stripe_customer_id: string | null;
  billing_email: string | null;
  billing_status: string;
  current_period_start: string;
  current_period_end: string;
}

export function useProductPlans() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ["product-plans"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("product_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as ProductPlan[];
    },
  });

  const billingQuery = useQuery({
    queryKey: ["billing-account", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return null;
      const { data, error } = await (supabase as any)
        .from("billing_accounts")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .maybeSingle();
      if (error) throw error;
      return data as BillingAccount | null;
    },
    enabled: !!currentOrg,
  });

  const selectPlan = useMutation({
    mutationFn: async (planId: string) => {
      if (!currentOrg) throw new Error("No org");
      const { error } = await (supabase as any)
        .from("billing_accounts")
        .upsert({
          organization_id: currentOrg.id,
          plan_id: planId,
          billing_status: "active",
        }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-account"] });
      toast({ title: "Plano atualizado", description: "Seu plano foi atualizado com sucesso." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const currentPlan = plansQuery.data?.find(
    (p) => p.id === billingQuery.data?.plan_id
  );

  return {
    plans: plansQuery.data || [],
    plansLoading: plansQuery.isLoading,
    billingAccount: billingQuery.data,
    currentPlan,
    selectPlan,
  };
}
