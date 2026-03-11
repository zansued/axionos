import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useCanonIntelligence() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const sources = useQuery({
    queryKey: ["canon-sources", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_sources")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const trustProfiles = useQuery({
    queryKey: ["canon-trust-profiles", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_source_trust_profiles")
        .select("*")
        .eq("organization_id", orgId!)
        .order("trust_score", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const candidates = useQuery({
    queryKey: ["canon-candidates", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_candidate_entries")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const syncRuns = useQuery({
    queryKey: ["canon-sync-runs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_source_sync_runs")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const domains = useQuery({
    queryKey: ["canon-source-domains", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_source_domains")
        .select("*")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  return {
    sources: sources.data || [],
    trustProfiles: trustProfiles.data || [],
    candidates: candidates.data || [],
    syncRuns: syncRuns.data || [],
    domains: domains.data || [],
    loading: sources.isLoading || candidates.isLoading,
    refetch: () => {
      sources.refetch();
      trustProfiles.refetch();
      candidates.refetch();
      syncRuns.refetch();
    },
  };
}
