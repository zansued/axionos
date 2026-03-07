import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useAgentMemoryDashboard() {
  const { currentOrg } = useOrg();

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["agent-memory-profiles", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("agent_memory_profiles")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg,
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["agent-memory-records", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("agent_memory_records")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg,
  });

  const activeProfiles = profiles.filter((p: any) => p.status === "active");
  const watchProfiles = profiles.filter((p: any) => p.status === "watch");
  const deprecatedProfiles = profiles.filter((p: any) => p.status === "deprecated");

  const byType = records.reduce((acc: Record<string, number>, r: any) => {
    acc[r.memory_type] = (acc[r.memory_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    profiles,
    records,
    activeProfiles,
    watchProfiles,
    deprecatedProfiles,
    byType,
    isLoading: profilesLoading || recordsLoading,
  };
}
