import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useProductIntelligence() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["product-intelligence-overview", orgId],
    enabled: !!orgId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("product-intelligence-entry-engine", {
        body: { action: "overview", params: { organization_id: orgId } },
      });
      if (error) throw error;
      return data?.overview || null;
    },
  });

  const signals = useQuery({
    queryKey: ["product-signals-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_signal_events" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as any[]) || [];
    },
  });

  const opportunities = useQuery({
    queryKey: ["product-opportunities-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_opportunity_candidates" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("priority_score", { ascending: false })
        .limit(30);
      return (data as any[]) || [];
    },
  });

  const frictionClusters = useQuery({
    queryKey: ["product-friction-clusters", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_friction_clusters" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("severity_score", { ascending: false })
        .limit(20);
      return (data as any[]) || [];
    },
  });

  const outcomes = useQuery({
    queryKey: ["product-intelligence-outcomes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_intelligence_outcomes" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data as any[]) || [];
    },
  });

  return {
    overview: overview.data,
    signals: signals.data || [],
    opportunities: opportunities.data || [],
    frictionClusters: frictionClusters.data || [],
    outcomes: outcomes.data || [],
    isLoading: overview.isLoading || signals.isLoading,
  };
}
