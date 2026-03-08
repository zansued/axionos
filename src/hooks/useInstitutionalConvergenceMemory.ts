import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useInstitutionalConvergenceMemory() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["institutional-convergence-memory-overview", orgId],
    enabled: !!orgId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("institutional-convergence-memory-engine", {
        body: { action: "overview", params: { organization_id: orgId } },
      });
      if (error) throw error;
      return data?.overview || null;
    },
  });

  const entries = useQuery({
    queryKey: ["convergence-memory-entries", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("convergence_memory_entries")
        .select("*")
        .eq("organization_id", orgId!)
        .order("memory_quality_score", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const patterns = useQuery({
    queryKey: ["convergence-memory-patterns", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("convergence_memory_patterns")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("status", "active")
        .order("pattern_strength", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const feedback = useQuery({
    queryKey: ["convergence-memory-feedback", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("convergence_memory_feedback")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const preservationSignals = useQuery({
    queryKey: ["convergence-memory-preservation", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("convergence_memory_entries")
        .select("*")
        .eq("organization_id", orgId!)
        .in("memory_type", ["retention_justified", "promotion_failure", "preservation_heuristic"])
        .order("memory_quality_score", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  return {
    overview: overview.data,
    entries: entries.data || [],
    patterns: patterns.data || [],
    feedback: feedback.data || [],
    preservationSignals: preservationSignals.data || [],
    isLoading: overview.isLoading || entries.isLoading,
  };
}
