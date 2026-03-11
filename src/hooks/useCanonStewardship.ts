import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useCanonStewardship() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const library = useQuery({
    queryKey: ["canon-library", orgId],
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

  const reviews = useQuery({
    queryKey: ["canon-stewardship-reviews", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_entry_reviews")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const conflicts = useQuery({
    queryKey: ["canon-conflicts", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_entry_conflicts")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const supersessions = useQuery({
    queryKey: ["canon-supersessions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_supersession_links")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  return {
    library: library.data || [],
    reviews: reviews.data || [],
    conflicts: conflicts.data || [],
    supersessions: supersessions.data || [],
    loading: library.isLoading,
    refetch: () => {
      library.refetch();
      reviews.refetch();
      conflicts.refetch();
      supersessions.refetch();
    },
  };
}
