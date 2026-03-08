import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useProductIntelligenceOperations() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["product-ops-overview", orgId],
    enabled: !!orgId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("product-intelligence-operations-engine", {
        body: { action: "overview", params: { organization_id: orgId } },
      });
      if (error) throw error;
      return data?.overview || null;
    },
  });

  const benchmarks = useQuery({
    queryKey: ["product-ops-benchmarks", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_operational_benchmarks" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("product_priority_score", { ascending: false })
        .limit(50);
      return (data as any[]) || [];
    },
  });

  const recommendations = useQuery({
    queryKey: ["product-ops-recommendations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_operational_recommendations" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("priority_score", { ascending: false })
        .limit(30);
      return (data as any[]) || [];
    },
  });

  const archCorrelations = useQuery({
    queryKey: ["product-ops-arch-correlations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_architecture_correlations" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .limit(30);
      return (data as any[]) || [];
    },
  });

  const profileCorrelations = useQuery({
    queryKey: ["product-ops-profile-correlations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_profile_correlations" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .limit(30);
      return (data as any[]) || [];
    },
  });

  const outcomes = useQuery({
    queryKey: ["product-ops-outcomes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_benchmark_outcomes" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data as any[]) || [];
    },
  });

  return {
    overview: overview.data,
    benchmarks: benchmarks.data || [],
    recommendations: recommendations.data || [],
    archCorrelations: archCorrelations.data || [],
    profileCorrelations: profileCorrelations.data || [],
    outcomes: outcomes.data || [],
    isLoading: overview.isLoading || benchmarks.isLoading,
  };
}
