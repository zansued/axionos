import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useCanonGovernance() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const entries = useQuery({
    queryKey: ["canon-entries", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_entries")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const categories = useQuery({
    queryKey: ["canon-categories", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_categories")
        .select("*")
        .eq("organization_id", orgId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const stewards = useQuery({
    queryKey: ["canon-stewards", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_stewards")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const deprecations = useQuery({
    queryKey: ["canon-deprecations", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_deprecations")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  return {
    entries: entries.data || [],
    categories: categories.data || [],
    stewards: stewards.data || [],
    deprecations: deprecations.data || [],
    loading: entries.isLoading,
    refetch: entries.refetch,
  };
}
