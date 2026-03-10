import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrgContext";

export function useTenantDoctrine() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["tenant-operating-profiles", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("tenant_operating_profiles").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: signals = [], isLoading: loadingSignals } = useQuery({
    queryKey: ["tenant-doctrine-signals", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("tenant_doctrine_signals").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ["doctrine-conflict-cases", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("doctrine_conflict_cases").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ["doctrine-adjustment-events", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("doctrine_adjustment_events").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["tenant-doctrine-reviews", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("tenant_doctrine_reviews").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!orgId,
  });

  const activeProfile = profiles.find((p: any) => p.profile_status === 'active' || p.profile_status === 'approved') || profiles[0];

  return {
    profiles,
    activeProfile,
    signals,
    conflicts,
    adjustments,
    reviews,
    isLoading: loadingProfiles || loadingSignals,
  };
}
