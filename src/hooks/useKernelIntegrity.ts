import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useKernelIntegrity() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const snapshots = useQuery({
    queryKey: ["kernel-snapshots", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kernel_integrity_snapshots")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const corrosionSignals = useQuery({
    queryKey: ["corrosion-signals", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corrosion_signals")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const bloatIndicators = useQuery({
    queryKey: ["bloat-indicators", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("architectural_bloat_indicators")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const driftCases = useQuery({
    queryKey: ["existential-drift-cases", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("existential_drift_cases")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const reviews = useQuery({
    queryKey: ["kernel-reviews", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kernel_protection_reviews")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const actions = useQuery({
    queryKey: ["kernel-actions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kernel_integrity_actions")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const latestSnapshot = snapshots.data?.[0] || null;

  return {
    snapshots: snapshots.data || [],
    latestSnapshot,
    corrosionSignals: corrosionSignals.data || [],
    bloatIndicators: bloatIndicators.data || [],
    driftCases: driftCases.data || [],
    reviews: reviews.data || [],
    actions: actions.data || [],
    loading: snapshots.isLoading || corrosionSignals.isLoading,
  };
}
