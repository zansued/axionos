import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useOperatingProfiles() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["operating-profiles-overview", orgId],
    enabled: !!orgId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("operating-profiles-engine", {
        body: { action: "overview", params: { organization_id: orgId } },
      });
      if (error) throw error;
      return data?.overview || null;
    },
  });

  const profiles = useQuery({
    queryKey: ["operating-profiles-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("operating_profiles")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const policyPacks = useQuery({
    queryKey: ["policy-packs-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("policy_packs")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const overrides = useQuery({
    queryKey: ["operating-profile-overrides", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("operating_profile_overrides")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const outcomes = useQuery({
    queryKey: ["profile-outcomes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_outcomes")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  return {
    overview: overview.data,
    profiles: profiles.data || [],
    policyPacks: policyPacks.data || [],
    overrides: overrides.data || [],
    outcomes: outcomes.data || [],
    isLoading: overview.isLoading || profiles.isLoading,
  };
}
